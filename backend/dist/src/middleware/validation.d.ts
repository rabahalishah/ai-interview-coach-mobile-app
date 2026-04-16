import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export interface ValidationSchema {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
    headers?: Joi.ObjectSchema;
}
export declare function validateRequest(schema: ValidationSchema): (req: Request, res: Response, next: NextFunction) => void;
export declare const validationSchemas: {
    auth: {
        register: {
            body: Joi.ObjectSchema<any>;
        };
        login: {
            body: Joi.ObjectSchema<any>;
        };
        refresh: {
            body: Joi.ObjectSchema<any>;
        };
        google: {
            body: Joi.ObjectSchema<any>;
        };
        forgotPassword: {
            body: Joi.ObjectSchema<any>;
        };
        verifyOtp: {
            body: Joi.ObjectSchema<any>;
        };
        verifyEmail: {
            body: Joi.ObjectSchema<any>;
        };
        resendVerification: {
            body: Joi.ObjectSchema<any>;
        };
        resetPassword: {
            body: Joi.ObjectSchema<any>;
        };
        changePassword: {
            body: Joi.ObjectSchema<any>;
        };
        changeEmailRequest: {
            body: Joi.ObjectSchema<any>;
        };
        changeEmailConfirm: {
            body: Joi.ObjectSchema<any>;
        };
        changeEmailResend: {
            body: Joi.ObjectSchema<any>;
        };
    };
    profile: {
        update: {
            body: Joi.ObjectSchema<any>;
        };
        targetRole: {
            body: Joi.ObjectSchema<any>;
        };
    };
    sessions: {
        sessionId: {
            params: Joi.ObjectSchema<any>;
        };
        updateTranscript: {
            params: Joi.ObjectSchema<any>;
            body: Joi.ObjectSchema<any>;
        };
        updateDisplayName: {
            params: Joi.ObjectSchema<any>;
            body: Joi.ObjectSchema<any>;
        };
        history: {
            query: Joi.ObjectSchema<any>;
        };
    };
    subscription: {
        upgrade: {
            body: Joi.ObjectSchema<any>;
        };
    };
    dashboard: {
        insights: {
            query: Joi.ObjectSchema<any>;
        };
        trends: {
            query: Joi.ObjectSchema<any>;
        };
    };
    admin: {
        resetUsage: {
            body: Joi.ObjectSchema<any>;
        };
        users: {
            query: Joi.ObjectSchema<any>;
        };
    };
};
export declare const fileValidation: {
    resume: {
        allowedTypes: string[];
        maxSize: number;
        validate: (file: Express.Multer.File) => void;
    };
    audio: {
        allowedTypes: string[];
        maxSize: number;
        validate: (file: Express.Multer.File) => void;
    };
};
export declare function sanitizeInput(req: Request, res: Response, next: NextFunction): void;
export declare function validateRateLimit(windowMs: number, maxRequests: number): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=validation.d.ts.map