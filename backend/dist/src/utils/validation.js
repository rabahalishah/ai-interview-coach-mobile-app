"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePagination = exports.isValidUUID = exports.sanitizeEmail = exports.sanitizeString = exports.createValidationMiddleware = exports.validateFile = exports.validateParams = exports.validateQuery = exports.validateBody = exports.validate = exports.ValidationUtils = exports.paramSchemas = exports.adminSchemas = exports.dashboardSchemas = exports.sessionSchemas = exports.profileSchemas = exports.authSchemas = void 0;
const joi_1 = __importDefault(require("joi"));
const constants_1 = require("./constants");
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'ValidationError';
    }
}
const passwordSchema = joi_1.default.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters'
});
const emailSchema = joi_1.default.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .lowercase()
    .trim()
    .messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email address is too long'
});
const uuidSchema = joi_1.default.string()
    .pattern(/^(c[a-z0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)
    .messages({
    'string.pattern.base': 'Invalid ID format'
});
const audioFileSchema = joi_1.default.object({
    mimetype: joi_1.default.string().valid('audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg').required(),
    size: joi_1.default.number().max(constants_1.FILE_SIZE_LIMITS.AUDIO).required(),
    originalname: joi_1.default.string().required()
});
const resumeFileSchema = joi_1.default.object({
    mimetype: joi_1.default.string().valid('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').required(),
    size: joi_1.default.number().max(10 * 1024 * 1024).required(),
    originalname: joi_1.default.string().required()
});
exports.authSchemas = {
    register: joi_1.default.object({
        email: emailSchema.required(),
        password: passwordSchema.required()
    }),
    login: joi_1.default.object({
        email: emailSchema.required(),
        password: joi_1.default.string().required().messages({
            'any.required': 'Password is required'
        })
    }),
    refreshToken: joi_1.default.object({
        token: joi_1.default.string().required().messages({
            'any.required': 'Refresh token is required'
        })
    })
};
exports.profileSchemas = {
    updateProfile: joi_1.default.object({
        fullName: joi_1.default.string().max(100).trim().optional(),
        currentJobTitle: joi_1.default.string().max(100).trim().optional(),
        currentCompany: joi_1.default.string().max(100).trim().optional(),
        school: joi_1.default.string().max(200).trim().optional(),
        degreeInfo: joi_1.default.string().max(200).trim().optional(),
        previousJobTitles: joi_1.default.array().items(joi_1.default.string().max(100).trim()).optional(),
        targetIndustry: joi_1.default.string().max(100).trim().optional(),
        targetJobTitle: joi_1.default.string().max(100).trim().optional(),
        experienceLevel: joi_1.default.string().max(50).trim().optional()
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    }),
    onboardingPartial: joi_1.default.object({
        fullName: joi_1.default.string().max(100).trim().optional(),
        currentJobTitle: joi_1.default.string().max(100).trim().optional(),
        currentCompany: joi_1.default.string().max(100).trim().optional(),
        school: joi_1.default.string().max(200).trim().optional(),
        degreeInfo: joi_1.default.string().max(200).trim().optional(),
        previousJobTitles: joi_1.default.array().items(joi_1.default.string().max(100).trim()).optional(),
        targetIndustry: joi_1.default.string().max(100).trim().optional(),
        targetJobTitle: joi_1.default.string().max(100).trim().optional(),
        experienceLevel: joi_1.default.string().max(50).trim().optional()
    }),
    targetRole: joi_1.default.object({
        industry: joi_1.default.string().max(100).trim().required(),
        jobTitle: joi_1.default.string().max(100).trim().required()
    }),
    resumeUpload: resumeFileSchema
};
exports.sessionSchemas = {
    startSession: joi_1.default.object({}),
    audioUpload: joi_1.default.object({
        sessionId: uuidSchema.required()
    }),
    sessionHistory: joi_1.default.object({
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        offset: joi_1.default.number().integer().min(0).default(0)
    }),
    getSession: joi_1.default.object({
        sessionId: uuidSchema.required()
    }),
    audioFile: audioFileSchema
};
exports.dashboardSchemas = {
    getStats: joi_1.default.object({}),
    getInsights: joi_1.default.object({
        limit: joi_1.default.number().integer().min(1).max(50).default(10)
    }),
    getTrends: joi_1.default.object({
        days: joi_1.default.number().integer().min(7).max(365).default(30)
    })
};
exports.adminSchemas = {
    healthCheck: joi_1.default.object({}),
    resetUsage: joi_1.default.object({
        month: joi_1.default.number().integer().min(1).max(12).optional(),
        year: joi_1.default.number().integer().min(2020).max(2030).optional(),
        dryRun: joi_1.default.boolean().optional().default(false)
    }),
    userManagement: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).optional().default(1),
        limit: joi_1.default.number().integer().min(1).max(100).optional().default(50),
        search: joi_1.default.string().max(100).optional(),
        subscriptionTier: joi_1.default.string().valid('free', 'paid').optional()
    }),
    systemConfig: joi_1.default.object({})
};
exports.paramSchemas = {
    userId: joi_1.default.object({
        userId: uuidSchema.required()
    }),
    sessionId: joi_1.default.object({
        sessionId: uuidSchema.required()
    }),
    id: joi_1.default.object({
        id: uuidSchema.required()
    })
};
class ValidationUtils {
    static validate(data, schema, options = {}) {
        const defaultOptions = {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true,
            ...options
        };
        const { error, value } = schema.validate(data, defaultOptions);
        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            throw new ValidationError('Validation failed', { details });
        }
        return value;
    }
    static validateBody(body, schema) {
        return this.validate(body, schema);
    }
    static validateQuery(query, schema) {
        return this.validate(query, schema);
    }
    static validateParams(params, schema) {
        return this.validate(params, schema);
    }
    static validateFile(file, schema) {
        if (!file) {
            throw new ValidationError('File is required');
        }
        return this.validate(file, schema);
    }
    static createValidationMiddleware(schemas) {
        return (req, res, next) => {
            try {
                if (schemas.body) {
                    req.body = this.validateBody(req.body, schemas.body);
                }
                if (schemas.query) {
                    req.query = this.validateQuery(req.query, schemas.query);
                }
                if (schemas.params) {
                    req.params = this.validateParams(req.params, schemas.params);
                }
                if (schemas.file && req.file) {
                    this.validateFile(req.file, schemas.file);
                }
                next();
            }
            catch (error) {
                next(error);
            }
        };
    }
    static sanitizeString(input) {
        if (typeof input !== 'string') {
            return '';
        }
        return input
            .trim()
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }
    static sanitizeEmail(email) {
        const sanitized = this.sanitizeString(email).toLowerCase();
        this.validate(sanitized, emailSchema);
        return sanitized;
    }
    static isValidUUID(uuid) {
        if (!uuid || typeof uuid !== 'string') {
            return false;
        }
        try {
            this.validate(uuid, uuidSchema);
            return true;
        }
        catch {
            return false;
        }
    }
    static validatePagination(query) {
        const schema = joi_1.default.object({
            limit: joi_1.default.number().integer().min(1).max(100).default(20),
            offset: joi_1.default.number().integer().min(0).default(0),
            page: joi_1.default.number().integer().min(1).optional()
        });
        const validated = this.validate(query, schema);
        if (validated.page) {
            validated.offset = (validated.page - 1) * validated.limit;
        }
        return {
            limit: validated.limit,
            offset: validated.offset
        };
    }
}
exports.ValidationUtils = ValidationUtils;
exports.validate = ValidationUtils.validate, exports.validateBody = ValidationUtils.validateBody, exports.validateQuery = ValidationUtils.validateQuery, exports.validateParams = ValidationUtils.validateParams, exports.validateFile = ValidationUtils.validateFile, exports.createValidationMiddleware = ValidationUtils.createValidationMiddleware, exports.sanitizeString = ValidationUtils.sanitizeString, exports.sanitizeEmail = ValidationUtils.sanitizeEmail, exports.isValidUUID = ValidationUtils.isValidUUID, exports.validatePagination = ValidationUtils.validatePagination;
//# sourceMappingURL=validation.js.map