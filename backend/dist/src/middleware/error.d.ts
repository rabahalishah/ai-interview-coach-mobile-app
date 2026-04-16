import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, AuthenticationError, NotFoundError, ExternalServiceError } from '../types/auth';
declare class AuthorizationError extends AppError {
    constructor(message?: string, details?: any);
}
declare class UsageLimitError extends AppError {
    constructor(message?: string, details?: any);
}
export declare const errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const createValidationError: (message: string, details?: any) => ValidationError;
export declare const createAuthError: (message?: string, details?: any) => AuthenticationError;
export declare const createAuthzError: (message?: string, details?: any) => AuthorizationError;
export declare const createNotFoundError: (message?: string, details?: any) => NotFoundError;
export declare const createUsageLimitError: (message?: string, details?: any) => UsageLimitError;
export declare const createExternalServiceError: (message?: string, details?: any) => ExternalServiceError;
export declare class CircuitBreaker {
    private name;
    private failureThreshold;
    private recoveryTimeout;
    private halfOpenMaxAttempts;
    private successThreshold;
    private failures;
    private successes;
    private lastFailureTime;
    private lastSuccessTime;
    private state;
    private halfOpenAttempts;
    constructor(name: string, failureThreshold?: number, recoveryTimeout?: number, halfOpenMaxAttempts?: number, successThreshold?: number);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getState(): string;
    getFailures(): number;
    getSuccesses(): number;
    getMetrics(): {
        name: string;
        state: string;
        failures: number;
        successes: number;
        lastFailureTime: number;
        lastSuccessTime: number;
        uptime: number;
    };
    reset(): void;
}
export declare const withRetry: <T>(operation: () => Promise<T>, options?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    jitterMax?: number;
    retryCondition?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
}) => Promise<T>;
export declare class GracefulDegradationManager {
    private static instance;
    private degradationStates;
    static getInstance(): GracefulDegradationManager;
    activateDegradation(serviceName: string, reason: string, fallbackStrategy: string): void;
    deactivateDegradation(serviceName: string): void;
    isDegraded(serviceName: string): boolean;
    getDegradationState(serviceName: string): {
        isActive: boolean;
        startTime: number;
        reason: string;
        fallbackStrategy: string;
    } | undefined;
    getActiveDegradations(): Record<string, any>;
}
export declare class FileOperationRecovery {
    private static instance;
    private pendingOperations;
    static getInstance(): FileOperationRecovery;
    executeWithRecovery<T>(operationId: string, operation: () => Promise<T>, options?: {
        maxRetries?: number;
        retryDelay?: number;
        cleanupOnFailure?: () => Promise<void>;
    }): Promise<T>;
    private retryOperation;
    getPendingOperations(): Record<string, any>;
    private calculateNextRetryTime;
}
export declare class ErrorClassificationManager {
    private static instance;
    private errorPatterns;
    static getInstance(): ErrorClassificationManager;
    private initializePatterns;
    addPattern(name: string, pattern: RegExp, classification: string, retryable: boolean, degradationStrategy?: string): void;
    classifyError(error: Error): {
        classification: string;
        retryable: boolean;
        degradationStrategy?: string;
        matchedPattern?: string;
    };
}
export declare const handleErrorWithRecovery: (error: Error, context: {
    operation: string;
    serviceName?: string;
    userId?: string;
    sessionId?: string;
    retryable?: boolean;
}) => Promise<{
    shouldRetry: boolean;
    degradationActivated: boolean;
    recoveryAction?: string;
}>;
export {};
//# sourceMappingURL=error.d.ts.map