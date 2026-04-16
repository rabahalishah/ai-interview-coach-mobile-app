"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlingService = exports.ErrorHandlingService = void 0;
const error_1 = require("../middleware/error");
class ErrorHandlingService {
    constructor() {
        this.circuitBreakers = new Map();
        this.degradationManager = error_1.GracefulDegradationManager.getInstance();
        this.fileRecovery = error_1.FileOperationRecovery.getInstance();
        this.errorClassifier = error_1.ErrorClassificationManager.getInstance();
        this.initializeCircuitBreakers();
    }
    static getInstance() {
        if (!ErrorHandlingService.instance) {
            ErrorHandlingService.instance = new ErrorHandlingService();
        }
        return ErrorHandlingService.instance;
    }
    initializeCircuitBreakers() {
        this.circuitBreakers.set('openai', new error_1.CircuitBreaker('OpenAI API', 5, 60000, 3, 2));
        this.circuitBreakers.set('openai-whisper', new error_1.CircuitBreaker('OpenAI Whisper', 20, 90000, 3, 2));
        this.circuitBreakers.set('s3', new error_1.CircuitBreaker('AWS S3', 3, 30000, 2, 1));
        this.circuitBreakers.set('database', new error_1.CircuitBreaker('Database', 10, 120000, 5, 3));
    }
    async executeWithCircuitBreaker(serviceName, operation, fallback) {
        const circuitBreaker = this.circuitBreakers.get(serviceName);
        if (!circuitBreaker) {
            throw new Error(`No circuit breaker configured for service: ${serviceName}`);
        }
        try {
            return await circuitBreaker.execute(operation);
        }
        catch (error) {
            if (circuitBreaker.getState() === 'OPEN' && fallback) {
                console.warn(`Using fallback for ${serviceName} due to circuit breaker OPEN state`);
                this.degradationManager.activateDegradation(serviceName, 'Circuit breaker open, using fallback', 'Fallback operation');
                return await fallback();
            }
            throw error;
        }
    }
    async executeFileOperation(operationId, operation, options = {}) {
        try {
            return await this.fileRecovery.executeWithRecovery(operationId, operation, options);
        }
        catch (error) {
            const recovery = await (0, error_1.handleErrorWithRecovery)(error, {
                operation: 'file_operation',
                serviceName: 's3'
            });
            if (recovery.degradationActivated && options.fallback) {
                console.warn(`Using fallback for file operation ${operationId}`);
                return await options.fallback();
            }
            throw error;
        }
    }
    async executeExternalApiCall(serviceName, operation, options = {}) {
        const { maxRetries = 3, retryCondition, fallback, operationId } = options;
        return await (0, error_1.withRetry)(async () => {
            return await this.executeWithCircuitBreaker(serviceName, operation, fallback);
        }, {
            maxRetries,
            retryCondition: retryCondition || ((error) => {
                const classification = this.errorClassifier.classifyError(error);
                return classification.retryable;
            }),
            onRetry: (attempt, error) => {
                console.warn(`Retrying ${serviceName} operation`, {
                    attempt,
                    error: error.message,
                    operationId
                });
            }
        });
    }
    async executeOpenAIOperation(operation, operationId, fallback, options) {
        const circuitKey = options?.circuitBreakerKey ?? 'openai';
        try {
            return await this.retryWithBackoff(() => this.executeWithCircuitBreaker(circuitKey, operation), {
                operationName: operationId,
                isRetryable: (error) => {
                    const message = error.message.toLowerCase();
                    const statusCode = error?.statusCode;
                    if (message.includes('failed to parse analysis response') ||
                        message.includes('no json found in response') ||
                        message.includes('missing required fields in analysis response')) {
                        return false;
                    }
                    if (message.includes('invalid api key') ||
                        message.includes('unauthorized') ||
                        message.includes('forbidden') ||
                        message.includes('quota') ||
                        message.includes('billing')) {
                        return false;
                    }
                    if (message.includes('rate limit') ||
                        message.includes('retry-after') ||
                        message.includes('timeout') ||
                        message.includes('timed out') ||
                        message.includes('server error') ||
                        message.includes('service unavailable') ||
                        message.includes('temporarily unavailable') ||
                        message.includes('unavailable') ||
                        /5\d{2}/.test(message)) {
                        return true;
                    }
                    if (typeof statusCode === 'number') {
                        return statusCode === 429 || (statusCode >= 500 && statusCode <= 599);
                    }
                    return true;
                },
                onRetry: (attempt, error, delay) => {
                    console.warn(`Retrying OpenAI operation ${operationId}`, {
                        attempt,
                        error: error.message,
                        delayMs: delay
                    });
                }
            });
        }
        catch (error) {
            if (fallback) {
                console.warn(`All retries failed for OpenAI operation ${operationId}, using fallback`);
                this.degradationManager.activateDegradation('openai', `All retries exhausted for ${operationId}`, 'Fallback operation');
                return await fallback();
            }
            throw error;
        }
    }
    async executeS3Operation(operation, operationId, cleanupOnFailure) {
        try {
            return await this.retryWithBackoff(() => this.executeWithCircuitBreaker('s3', operation), {
                operationName: operationId,
                isRetryable: (error) => this.isRetryableS3Error(error),
                onRetry: (attempt, error, delay) => {
                    console.warn(`Retrying S3 operation ${operationId}`, {
                        attempt,
                        error: error.message,
                        delayMs: delay
                    });
                }
            });
        }
        catch (error) {
            if (cleanupOnFailure) {
                try {
                    await cleanupOnFailure();
                    console.log(`Cleanup completed for failed S3 operation ${operationId}`);
                }
                catch (cleanupError) {
                    console.error(`Cleanup failed for S3 operation ${operationId}`, cleanupError);
                }
            }
            throw error;
        }
    }
    async executeDatabaseOperation(operation, operationId) {
        return await this.executeExternalApiCall('database', operation, {
            maxRetries: 2,
            retryCondition: (error) => {
                const message = error.message.toLowerCase();
                return message.includes('connection') ||
                    message.includes('timeout') ||
                    message.includes('deadlock');
            },
            operationId
        });
    }
    getSystemHealth() {
        const circuitBreakers = {};
        let openCircuitBreakers = 0;
        for (const [name, breaker] of this.circuitBreakers.entries()) {
            const metrics = breaker.getMetrics();
            circuitBreakers[name] = metrics;
            if (metrics.state === 'OPEN') {
                openCircuitBreakers++;
            }
        }
        const degradations = this.degradationManager.getActiveDegradations();
        const pendingFileOperations = this.fileRecovery.getPendingOperations();
        let overallStatus = 'healthy';
        if (openCircuitBreakers > 0 || Object.keys(degradations).length > 0) {
            overallStatus = 'degraded';
        }
        if (openCircuitBreakers >= 2 || Object.keys(pendingFileOperations).length > 5) {
            overallStatus = 'critical';
        }
        return {
            circuitBreakers,
            degradations,
            pendingFileOperations,
            overallStatus
        };
    }
    resetCircuitBreaker(serviceName) {
        const circuitBreaker = this.circuitBreakers.get(serviceName);
        if (circuitBreaker) {
            circuitBreaker.reset();
            return true;
        }
        return false;
    }
    deactivateDegradation(serviceName) {
        this.degradationManager.deactivateDegradation(serviceName);
    }
    addErrorPattern(name, pattern, classification, retryable, degradationStrategy) {
        this.errorClassifier.addPattern(name, pattern, classification, retryable, degradationStrategy);
    }
    classifyError(error) {
        return this.errorClassifier.classifyError(error);
    }
    async retryWithBackoff(operation, options = {}) {
        const delays = [1000, 2000, 4000];
        const maxAttempts = delays.length + 1;
        let lastError;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxAttempts - 1) {
                    console.error(`Operation ${options.operationName || 'unknown'} failed after ${maxAttempts} attempts`, {
                        error: lastError.message
                    });
                    throw lastError;
                }
                const isRetryable = options.isRetryable
                    ? options.isRetryable(lastError)
                    : this.isRetryableError(lastError);
                if (!isRetryable) {
                    console.warn(`Operation ${options.operationName || 'unknown'} failed with non-retryable error`, {
                        error: lastError.message
                    });
                    throw lastError;
                }
                let delay = delays[attempt];
                const retryAfter = this.extractRetryAfter(lastError);
                if (retryAfter !== null) {
                    delay = retryAfter * 1000;
                    console.log(`Respecting Retry-After header: ${retryAfter}s`);
                }
                console.warn(`Retrying operation ${options.operationName || 'unknown'} (attempt ${attempt + 1}/${maxAttempts - 1})`, {
                    error: lastError.message,
                    delayMs: delay,
                    nextAttempt: attempt + 2
                });
                if (options.onRetry) {
                    options.onRetry(attempt + 1, lastError, delay);
                }
                await this.sleep(delay);
            }
        }
        throw lastError;
    }
    isRetryableError(error) {
        const classification = this.errorClassifier.classifyError(error);
        if (classification.retryable) {
            return true;
        }
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('timeout') ||
            errorMessage.includes('econnreset') ||
            errorMessage.includes('econnrefused') ||
            errorMessage.includes('etimedout')) {
            return true;
        }
        if (/5\d{2}/.test(errorMessage) || errorMessage.includes('429')) {
            return true;
        }
        if (errorMessage.includes('rate limit') || errorMessage.includes('rate_limit')) {
            return true;
        }
        if (/4[0-8]\d/.test(errorMessage) || errorMessage.includes('400') ||
            errorMessage.includes('401') || errorMessage.includes('403') ||
            errorMessage.includes('404')) {
            return false;
        }
        return false;
    }
    extractRetryAfter(error) {
        const errorAny = error;
        if (errorAny.response?.headers?.['retry-after']) {
            const retryAfter = errorAny.response.headers['retry-after'];
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds) && seconds > 0) {
                return seconds;
            }
        }
        const retryAfterMatch = error.message.match(/retry[_\s-]?after[:\s]+(\d+)/i);
        if (retryAfterMatch) {
            const seconds = parseInt(retryAfterMatch[1], 10);
            if (!isNaN(seconds) && seconds > 0) {
                return seconds;
            }
        }
        return null;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    isRetryableS3Error(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        const errorAny = error;
        const statusCode = errorAny.statusCode || errorAny.$metadata?.httpStatusCode;
        if (statusCode) {
            if (statusCode === 500 || statusCode === 503) {
                return true;
            }
            if (statusCode === 400 || statusCode === 403 || statusCode === 404) {
                return false;
            }
        }
        if (errorMessage.includes('500') || errorMessage.includes('503')) {
            return true;
        }
        if (errorMessage.includes('400') || errorMessage.includes('403') ||
            errorMessage.includes('404') || errorMessage.includes('not found') ||
            errorMessage.includes('access denied')) {
            return false;
        }
        if (errorMessage.includes('slowdown') || errorMessage.includes('throttl')) {
            return true;
        }
        return false;
    }
}
exports.ErrorHandlingService = ErrorHandlingService;
exports.errorHandlingService = ErrorHandlingService.getInstance();
//# sourceMappingURL=ErrorHandlingService.js.map