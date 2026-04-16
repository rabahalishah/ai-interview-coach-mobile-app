import Joi from 'joi';
export declare const authSchemas: {
    register: Joi.ObjectSchema<any>;
    login: Joi.ObjectSchema<any>;
    refreshToken: Joi.ObjectSchema<any>;
};
export declare const profileSchemas: {
    updateProfile: Joi.ObjectSchema<any>;
    onboardingPartial: Joi.ObjectSchema<any>;
    targetRole: Joi.ObjectSchema<any>;
    resumeUpload: Joi.ObjectSchema<any>;
};
export declare const sessionSchemas: {
    startSession: Joi.ObjectSchema<any>;
    audioUpload: Joi.ObjectSchema<any>;
    sessionHistory: Joi.ObjectSchema<any>;
    getSession: Joi.ObjectSchema<any>;
    audioFile: Joi.ObjectSchema<any>;
};
export declare const dashboardSchemas: {
    getStats: Joi.ObjectSchema<any>;
    getInsights: Joi.ObjectSchema<any>;
    getTrends: Joi.ObjectSchema<any>;
};
export declare const adminSchemas: {
    healthCheck: Joi.ObjectSchema<any>;
    resetUsage: Joi.ObjectSchema<any>;
    userManagement: Joi.ObjectSchema<any>;
    systemConfig: Joi.ObjectSchema<any>;
};
export declare const paramSchemas: {
    userId: Joi.ObjectSchema<any>;
    sessionId: Joi.ObjectSchema<any>;
    id: Joi.ObjectSchema<any>;
};
export interface ValidationOptions {
    abortEarly?: boolean;
    allowUnknown?: boolean;
    stripUnknown?: boolean;
}
export declare class ValidationUtils {
    static validate<T>(data: any, schema: Joi.Schema, options?: ValidationOptions): T;
    static validateBody<T>(body: any, schema: Joi.Schema): T;
    static validateQuery<T>(query: any, schema: Joi.Schema): T;
    static validateParams<T>(params: any, schema: Joi.Schema): T;
    static validateFile(file: any, schema: Joi.Schema): any;
    static createValidationMiddleware(schemas: {
        body?: Joi.Schema;
        query?: Joi.Schema;
        params?: Joi.Schema;
        file?: Joi.Schema;
    }): (req: any, res: any, next: any) => void;
    static sanitizeString(input: string): string;
    static sanitizeEmail(email: string): string;
    static isValidUUID(uuid: string): boolean;
    static validatePagination(query: any): {
        limit: number;
        offset: number;
    };
}
export declare const validate: typeof ValidationUtils.validate, validateBody: typeof ValidationUtils.validateBody, validateQuery: typeof ValidationUtils.validateQuery, validateParams: typeof ValidationUtils.validateParams, validateFile: typeof ValidationUtils.validateFile, createValidationMiddleware: typeof ValidationUtils.createValidationMiddleware, sanitizeString: typeof ValidationUtils.sanitizeString, sanitizeEmail: typeof ValidationUtils.sanitizeEmail, isValidUUID: typeof ValidationUtils.isValidUUID, validatePagination: typeof ValidationUtils.validatePagination;
//# sourceMappingURL=validation.d.ts.map