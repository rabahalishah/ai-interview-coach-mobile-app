import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export interface ComprehensiveValidationOptions {
    sanitizeInput?: boolean;
    validateHeaders?: boolean;
    logValidationErrors?: boolean;
    strictMode?: boolean;
    files?: {
        required?: boolean;
        maxCount?: number;
        allowedTypes?: string[];
        maxSize?: number;
    };
}
export declare function createComprehensiveValidation(schemas: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
    headers?: Joi.ObjectSchema;
    files?: {
        required?: boolean;
        maxCount?: number;
        allowedTypes?: string[];
        maxSize?: number;
    };
}, options?: ComprehensiveValidationOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const endpointValidation: {
    auth: {
        register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        refresh: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    };
    profile: {
        update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        targetRole: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        resumeUpload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    };
    sessions: {
        sessionId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        history: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        audioUpload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    };
    dashboard: {
        insights: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        trends: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    };
    subscription: {
        upgrade: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    };
    admin: {
        resetUsage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
        users: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    };
};
export declare function handleValidationError(error: any, req: Request, res: Response, next: NextFunction): void;
export declare class ValidationMetrics {
    private static instance;
    private validationCounts;
    private errorCounts;
    static getInstance(): ValidationMetrics;
    recordValidation(endpoint: string, success: boolean): void;
    getMetrics(): {
        validationCounts: {
            [k: string]: number;
        };
        errorCounts: {
            [k: string]: number;
        };
        totalValidations: number;
        totalErrors: number;
    };
    reset(): void;
}
//# sourceMappingURL=comprehensiveValidation.d.ts.map