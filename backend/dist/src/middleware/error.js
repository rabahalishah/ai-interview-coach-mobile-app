"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleErrorWithRecovery = exports.ErrorClassificationManager = exports.FileOperationRecovery = exports.GracefulDegradationManager = exports.withRetry = exports.CircuitBreaker = exports.createExternalServiceError = exports.createUsageLimitError = exports.createNotFoundError = exports.createAuthzError = exports.createAuthError = exports.createValidationError = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const auth_1 = require("../types/auth");
class AuthorizationError extends auth_1.AppError {
    constructor(message = 'Insufficient permissions', details) {
        super(auth_1.ErrorCode.AUTHORIZATION_ERROR, message, 403, details);
    }
}
class UsageLimitError extends auth_1.AppError {
    constructor(message = 'Usage limit exceeded', details) {
        super(auth_1.ErrorCode.USAGE_LIMIT_ERROR, message, 429, details);
    }
}
const errorHandler = (error, req, res, next) => {
    logError(error, req);
    if (error.name === 'AuthenticationError') {
        const errorResponse = {
            error: {
                code: auth_1.ErrorCode.AUTHENTICATION_ERROR,
                message: error.message || 'Authentication failed',
                details: error.details
            },
            timestamp: new Date().toISOString(),
            path: req.path
        };
        res.status(401).json(errorResponse);
        return;
    }
    if (error.name === 'AuthorizationError') {
        const errorResponse = {
            error: {
                code: auth_1.ErrorCode.AUTHORIZATION_ERROR,
                message: error.message || 'Insufficient permissions',
                details: error.details
            },
            timestamp: new Date().toISOString(),
            path: req.path
        };
        res.status(403).json(errorResponse);
        return;
    }
    if (error instanceof auth_1.AppError) {
        handleAppError(error, req, res);
    }
    else if (error.name === 'ValidationError') {
        const validationError = error;
        handleValidationError(validationError, req, res);
    }
    else if (error.name === 'ValidationError' && 'details' in error) {
        handleJoiValidationError(error, req, res);
    }
    else if (error.name === 'PrismaClientKnownRequestError') {
        handlePrismaError(error, req, res);
    }
    else if (error.name === 'MulterError') {
        handleMulterError(error, req, res);
    }
    else {
        handleUnknownError(error, req, res);
    }
};
exports.errorHandler = errorHandler;
function handleAppError(error, req, res) {
    const errorResponse = {
        error: {
            code: error.code,
            message: error.message,
            details: error.details
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };
    res.status(error.statusCode).json(errorResponse);
}
function handleValidationError(error, req, res) {
    const errorResponse = {
        error: {
            code: auth_1.ErrorCode.VALIDATION_ERROR,
            message: error.message || 'Validation failed',
            details: error.details
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };
    res.status(400).json(errorResponse);
}
function handleJoiValidationError(error, req, res) {
    const details = error.details?.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
    })) || [];
    const errorResponse = {
        error: {
            code: auth_1.ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
            details
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };
    res.status(400).json(errorResponse);
}
function handlePrismaError(error, req, res) {
    let statusCode = 500;
    let code = auth_1.ErrorCode.DATABASE_ERROR;
    let message = 'Database operation failed';
    switch (error.code) {
        case 'P2002':
            statusCode = 409;
            code = auth_1.ErrorCode.VALIDATION_ERROR;
            message = 'Resource already exists';
            break;
        case 'P2025':
            statusCode = 404;
            code = auth_1.ErrorCode.NOT_FOUND;
            message = 'Resource not found';
            break;
        case 'P2003':
            statusCode = 400;
            code = auth_1.ErrorCode.VALIDATION_ERROR;
            message = 'Invalid reference to related resource';
            break;
        case 'P2014':
            statusCode = 400;
            code = auth_1.ErrorCode.VALIDATION_ERROR;
            message = 'Required relationship missing';
            break;
        default:
            console.error('Unhandled Prisma error:', error.code, error.message);
    }
    const errorResponse = {
        error: {
            code,
            message,
            details: process.env.NODE_ENV === 'development' ? {
                prismaCode: error.code,
                prismaMessage: error.message
            } : undefined
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };
    res.status(statusCode).json(errorResponse);
}
function handleMulterError(error, req, res) {
    let message = 'File upload error';
    switch (error.code) {
        case 'LIMIT_FILE_SIZE':
            message = 'File size too large';
            break;
        case 'LIMIT_FILE_COUNT':
            message = 'Too many files';
            break;
        case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            break;
        case 'LIMIT_PART_COUNT':
            message = 'Too many parts';
            break;
        case 'LIMIT_FIELD_KEY':
            message = 'Field name too long';
            break;
        case 'LIMIT_FIELD_VALUE':
            message = 'Field value too long';
            break;
        case 'LIMIT_FIELD_COUNT':
            message = 'Too many fields';
            break;
        default:
            message = error.message || 'File upload error';
    }
    const errorResponse = {
        error: {
            code: auth_1.ErrorCode.VALIDATION_ERROR,
            message,
            details: { multerCode: error.code }
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };
    res.status(400).json(errorResponse);
}
function handleUnknownError(error, req, res) {
    const errorResponse = {
        error: {
            code: auth_1.ErrorCode.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
            details: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };
    res.status(500).json(errorResponse);
}
function logError(error, req) {
    const logData = {
        timestamp: new Date().toISOString(),
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        request: {
            method: req.method,
            path: req.path,
            query: req.query,
            params: req.params,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id
        }
    };
    if (req.body) {
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        delete sanitizedBody.token;
        logData.request['body'] = sanitizedBody;
    }
    if (error instanceof auth_1.AppError) {
        if (error.statusCode >= 500) {
            console.error('Server Error:', JSON.stringify(logData, null, 2));
        }
        else if (error.statusCode >= 400) {
            console.warn('Client Error:', JSON.stringify(logData, null, 2));
        }
    }
    else {
        console.error('Unexpected Error:', JSON.stringify(logData, null, 2));
    }
    if (process.env.NODE_ENV === 'production') {
    }
}
const notFoundHandler = (req, res) => {
    const path = req.path;
    let message = 'Endpoint not found';
    let details;
    if (path.startsWith('/api/api')) {
        message =
            'URL contains /api twice. Set your client base URL to the origin only (e.g. http://localhost:3000), then use paths like /api/onboarding/voice.';
        details = {
            receivedPath: path,
            hint: 'If base_url is already http://host:port/api, request only /onboarding/... not /api/onboarding/...'
        };
    }
    const errorResponse = {
        error: {
            code: auth_1.ErrorCode.NOT_FOUND,
            message,
            ...(details && { details })
        },
        timestamp: new Date().toISOString(),
        path
    };
    res.status(404).json(errorResponse);
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const createValidationError = (message, details) => {
    return new auth_1.ValidationError(message, details);
};
exports.createValidationError = createValidationError;
const createAuthError = (message, details) => {
    return new auth_1.AuthenticationError(message, details);
};
exports.createAuthError = createAuthError;
const createAuthzError = (message, details) => {
    return new AuthorizationError(message, details);
};
exports.createAuthzError = createAuthzError;
const createNotFoundError = (message, details) => {
    return new auth_1.NotFoundError(message, details);
};
exports.createNotFoundError = createNotFoundError;
const createUsageLimitError = (message, details) => {
    return new UsageLimitError(message, details);
};
exports.createUsageLimitError = createUsageLimitError;
const createExternalServiceError = (message, details) => {
    return new auth_1.ExternalServiceError(message, details);
};
exports.createExternalServiceError = createExternalServiceError;
class CircuitBreaker {
    constructor(name, failureThreshold = 5, recoveryTimeout = 60000, halfOpenMaxAttempts = 3, successThreshold = 2) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.recoveryTimeout = recoveryTimeout;
        this.halfOpenMaxAttempts = halfOpenMaxAttempts;
        this.successThreshold = successThreshold;
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = 0;
        this.lastSuccessTime = 0;
        this.state = 'CLOSED';
        this.halfOpenAttempts = 0;
    }
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
                this.state = 'HALF_OPEN';
                this.halfOpenAttempts = 0;
                console.log(`Circuit breaker ${this.name}: Transitioning to HALF_OPEN`);
            }
            else {
                throw new auth_1.ExternalServiceError(`Service ${this.name} temporarily unavailable (circuit breaker OPEN)`);
            }
        }
        if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
            throw new auth_1.ExternalServiceError(`Service ${this.name} temporarily unavailable (circuit breaker HALF_OPEN limit reached)`);
        }
        try {
            const startTime = Date.now();
            const result = await operation();
            const duration = Date.now() - startTime;
            this.onSuccess(duration);
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    onSuccess(duration) {
        this.successes++;
        this.lastSuccessTime = Date.now();
        if (this.state === 'HALF_OPEN') {
            this.halfOpenAttempts++;
            if (this.successes >= this.successThreshold) {
                this.state = 'CLOSED';
                this.failures = 0;
                this.successes = 0;
                console.log(`Circuit breaker ${this.name}: Transitioning to CLOSED after successful recovery`);
            }
        }
        else if (this.state === 'CLOSED') {
            this.failures = Math.max(0, this.failures - 1);
        }
        if (duration && duration > 5000) {
            console.warn(`Circuit breaker ${this.name}: Slow operation detected (${duration}ms)`);
        }
    }
    onFailure(error) {
        this.failures++;
        this.lastFailureTime = Date.now();
        console.error(`Circuit breaker ${this.name}: Operation failed`, {
            error: error.message,
            failures: this.failures,
            state: this.state
        });
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            console.log(`Circuit breaker ${this.name}: Transitioning to OPEN from HALF_OPEN after failure`);
        }
        else if (this.state === 'CLOSED' && this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            console.log(`Circuit breaker ${this.name}: Transitioning to OPEN after ${this.failures} failures`);
        }
    }
    getState() {
        return this.state;
    }
    getFailures() {
        return this.failures;
    }
    getSuccesses() {
        return this.successes;
    }
    getMetrics() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            uptime: this.state === 'CLOSED' ? Date.now() - this.lastFailureTime : 0
        };
    }
    reset() {
        this.failures = 0;
        this.successes = 0;
        this.state = 'CLOSED';
        this.halfOpenAttempts = 0;
        console.log(`Circuit breaker ${this.name}: Manual reset to CLOSED state`);
    }
}
exports.CircuitBreaker = CircuitBreaker;
const withRetry = async (operation, options = {}) => {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000, backoffMultiplier = 2, jitterMax = 1000, retryCondition = () => true, onRetry } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxRetries) {
                break;
            }
            if (!retryCondition(lastError)) {
                break;
            }
            if (onRetry) {
                onRetry(attempt + 1, lastError);
            }
            const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt);
            const jitter = Math.random() * jitterMax;
            const delay = Math.min(exponentialDelay + jitter, maxDelay);
            console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
                error: lastError.message,
                attempt: attempt + 1,
                delay
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
};
exports.withRetry = withRetry;
class GracefulDegradationManager {
    constructor() {
        this.degradationStates = new Map();
    }
    static getInstance() {
        if (!GracefulDegradationManager.instance) {
            GracefulDegradationManager.instance = new GracefulDegradationManager();
        }
        return GracefulDegradationManager.instance;
    }
    activateDegradation(serviceName, reason, fallbackStrategy) {
        this.degradationStates.set(serviceName, {
            isActive: true,
            startTime: Date.now(),
            reason,
            fallbackStrategy
        });
        console.warn(`Graceful degradation activated for ${serviceName}`, {
            reason,
            fallbackStrategy,
            timestamp: new Date().toISOString()
        });
    }
    deactivateDegradation(serviceName) {
        const state = this.degradationStates.get(serviceName);
        if (state) {
            const duration = Date.now() - state.startTime;
            console.log(`Graceful degradation deactivated for ${serviceName}`, {
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
        }
        this.degradationStates.delete(serviceName);
    }
    isDegraded(serviceName) {
        return this.degradationStates.has(serviceName);
    }
    getDegradationState(serviceName) {
        return this.degradationStates.get(serviceName);
    }
    getActiveDegradations() {
        const result = {};
        for (const [serviceName, state] of this.degradationStates.entries()) {
            result[serviceName] = {
                ...state,
                duration: Date.now() - state.startTime
            };
        }
        return result;
    }
}
exports.GracefulDegradationManager = GracefulDegradationManager;
class FileOperationRecovery {
    constructor() {
        this.pendingOperations = new Map();
    }
    static getInstance() {
        if (!FileOperationRecovery.instance) {
            FileOperationRecovery.instance = new FileOperationRecovery();
        }
        return FileOperationRecovery.instance;
    }
    async executeWithRecovery(operationId, operation, options = {}) {
        const { maxRetries = 3, retryDelay = 2000, cleanupOnFailure } = options;
        try {
            const result = await operation();
            this.pendingOperations.delete(operationId);
            return result;
        }
        catch (error) {
            console.error(`File operation ${operationId} failed`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                attempt: 1
            });
            this.pendingOperations.set(operationId, {
                operation,
                retryCount: 1,
                maxRetries,
                lastAttempt: Date.now()
            });
            if (cleanupOnFailure) {
                try {
                    await cleanupOnFailure();
                }
                catch (cleanupError) {
                    console.error(`Cleanup failed for operation ${operationId}`, cleanupError);
                }
            }
            setTimeout(() => this.retryOperation(operationId, retryDelay), retryDelay);
            throw error;
        }
    }
    async retryOperation(operationId, retryDelay) {
        const pendingOp = this.pendingOperations.get(operationId);
        if (!pendingOp) {
            return;
        }
        if (pendingOp.retryCount >= pendingOp.maxRetries) {
            console.error(`File operation ${operationId} failed after ${pendingOp.maxRetries} retries`);
            this.pendingOperations.delete(operationId);
            return;
        }
        try {
            await pendingOp.operation();
            console.log(`File operation ${operationId} succeeded on retry ${pendingOp.retryCount}`);
            this.pendingOperations.delete(operationId);
        }
        catch (error) {
            pendingOp.retryCount++;
            pendingOp.lastAttempt = Date.now();
            console.warn(`File operation ${operationId} retry ${pendingOp.retryCount} failed`, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            if (pendingOp.retryCount < pendingOp.maxRetries) {
                const nextDelay = retryDelay * Math.pow(2, pendingOp.retryCount - 1);
                setTimeout(() => this.retryOperation(operationId, nextDelay), nextDelay);
            }
            else {
                this.pendingOperations.delete(operationId);
            }
        }
    }
    getPendingOperations() {
        const result = {};
        for (const [operationId, operation] of this.pendingOperations.entries()) {
            result[operationId] = {
                retryCount: operation.retryCount,
                maxRetries: operation.maxRetries,
                lastAttempt: operation.lastAttempt,
                nextRetryIn: this.calculateNextRetryTime(operation)
            };
        }
        return result;
    }
    calculateNextRetryTime(operation) {
        const baseDelay = 2000;
        const nextDelay = baseDelay * Math.pow(2, operation.retryCount - 1);
        const elapsed = Date.now() - operation.lastAttempt;
        return Math.max(0, nextDelay - elapsed);
    }
}
exports.FileOperationRecovery = FileOperationRecovery;
class ErrorClassificationManager {
    constructor() {
        this.errorPatterns = new Map();
    }
    static getInstance() {
        if (!ErrorClassificationManager.instance) {
            ErrorClassificationManager.instance = new ErrorClassificationManager();
            ErrorClassificationManager.instance.initializePatterns();
        }
        return ErrorClassificationManager.instance;
    }
    initializePatterns() {
        this.addPattern('network_timeout', /timeout|ETIMEDOUT|ECONNRESET/i, 'network', true, 'retry_with_backoff');
        this.addPattern('network_connection', /ECONNREFUSED|ENOTFOUND|ENETUNREACH/i, 'network', true, 'circuit_breaker');
        this.addPattern('openai_rate_limit', /rate limit|429/i, 'rate_limit', true, 'exponential_backoff');
        this.addPattern('openai_quota', /quota|billing/i, 'quota', false, 'graceful_degradation');
        this.addPattern('openai_server', /5\d{2}|server error/i, 'server_error', true, 'circuit_breaker');
        this.addPattern('s3_access', /access denied|403/i, 'access', false, 'alert_admin');
        this.addPattern('s3_not_found', /not found|404/i, 'not_found', false, 'create_if_missing');
        this.addPattern('s3_throttle', /slow down|503/i, 'throttle', true, 'exponential_backoff');
        this.addPattern('db_connection', /connection|ECONNREFUSED/i, 'database', true, 'connection_pool_reset');
        this.addPattern('db_timeout', /timeout|query timeout/i, 'database', true, 'query_optimization');
        this.addPattern('db_constraint', /constraint|unique|foreign key/i, 'validation', false, 'data_validation');
    }
    addPattern(name, pattern, classification, retryable, degradationStrategy) {
        this.errorPatterns.set(name, {
            pattern,
            classification,
            retryable,
            degradationStrategy
        });
    }
    classifyError(error) {
        const errorMessage = error.message || error.toString();
        for (const [name, config] of this.errorPatterns.entries()) {
            if (config.pattern.test(errorMessage)) {
                return {
                    classification: config.classification,
                    retryable: config.retryable,
                    degradationStrategy: config.degradationStrategy,
                    matchedPattern: name
                };
            }
        }
        return {
            classification: 'unknown',
            retryable: false
        };
    }
}
exports.ErrorClassificationManager = ErrorClassificationManager;
const handleErrorWithRecovery = async (error, context) => {
    const classifier = ErrorClassificationManager.getInstance();
    const degradationManager = GracefulDegradationManager.getInstance();
    const classification = classifier.classifyError(error);
    console.error(`Error in ${context.operation}`, {
        error: error.message,
        classification: classification.classification,
        retryable: classification.retryable,
        context
    });
    let degradationActivated = false;
    let recoveryAction;
    if (classification.degradationStrategy && context.serviceName) {
        switch (classification.degradationStrategy) {
            case 'circuit_breaker':
                degradationManager.activateDegradation(context.serviceName, `Circuit breaker activated due to ${classification.classification} error`, 'Circuit breaker pattern with exponential backoff');
                degradationActivated = true;
                recoveryAction = 'circuit_breaker_activated';
                break;
            case 'graceful_degradation':
                degradationManager.activateDegradation(context.serviceName, `Service degraded due to ${classification.classification} error`, 'Limited functionality mode');
                degradationActivated = true;
                recoveryAction = 'service_degraded';
                break;
            case 'exponential_backoff':
                recoveryAction = 'exponential_backoff';
                break;
            case 'alert_admin':
                console.error(`ADMIN ALERT: Critical error in ${context.serviceName}`, {
                    error: error.message,
                    context
                });
                recoveryAction = 'admin_alerted';
                break;
        }
    }
    return {
        shouldRetry: classification.retryable && (context.retryable !== false),
        degradationActivated,
        recoveryAction
    };
};
exports.handleErrorWithRecovery = handleErrorWithRecovery;
//# sourceMappingURL=error.js.map