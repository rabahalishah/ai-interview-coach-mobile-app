export declare class ErrorHandlingService {
    private static instance;
    private circuitBreakers;
    private degradationManager;
    private fileRecovery;
    private errorClassifier;
    private constructor();
    static getInstance(): ErrorHandlingService;
    private initializeCircuitBreakers;
    executeWithCircuitBreaker<T>(serviceName: string, operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    executeFileOperation<T>(operationId: string, operation: () => Promise<T>, options?: {
        maxRetries?: number;
        retryDelay?: number;
        cleanupOnFailure?: () => Promise<void>;
        fallback?: () => Promise<T>;
    }): Promise<T>;
    executeExternalApiCall<T>(serviceName: string, operation: () => Promise<T>, options?: {
        maxRetries?: number;
        retryCondition?: (error: Error) => boolean;
        fallback?: () => Promise<T>;
        operationId?: string;
    }): Promise<T>;
    executeOpenAIOperation<T>(operation: () => Promise<T>, operationId: string, fallback?: () => Promise<T>, options?: {
        circuitBreakerKey?: string;
    }): Promise<T>;
    executeS3Operation<T>(operation: () => Promise<T>, operationId: string, cleanupOnFailure?: () => Promise<void>): Promise<T>;
    executeDatabaseOperation<T>(operation: () => Promise<T>, operationId: string): Promise<T>;
    getSystemHealth(): {
        circuitBreakers: Record<string, any>;
        degradations: Record<string, any>;
        pendingFileOperations: Record<string, any>;
        overallStatus: 'healthy' | 'degraded' | 'critical';
    };
    resetCircuitBreaker(serviceName: string): boolean;
    deactivateDegradation(serviceName: string): void;
    addErrorPattern(name: string, pattern: RegExp, classification: string, retryable: boolean, degradationStrategy?: string): void;
    classifyError(error: Error): {
        classification: string;
        retryable: boolean;
        degradationStrategy?: string;
        matchedPattern?: string;
    };
    retryWithBackoff<T>(operation: () => Promise<T>, options?: {
        operationName?: string;
        isRetryable?: (error: Error) => boolean;
        onRetry?: (attempt: number, error: Error, delay: number) => void;
    }): Promise<T>;
    private isRetryableError;
    private extractRetryAfter;
    private sleep;
    isRetryableS3Error(error: Error): boolean;
}
export declare const errorHandlingService: ErrorHandlingService;
//# sourceMappingURL=ErrorHandlingService.d.ts.map