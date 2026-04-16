"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileValidation = exports.validationSchemas = void 0;
exports.validateRequest = validateRequest;
exports.sanitizeInput = sanitizeInput;
exports.validateRateLimit = validateRateLimit;
const joi_1 = __importDefault(require("joi"));
const auth_1 = require("../types/auth");
const constants_1 = require("../utils/constants");
function validateRequest(schema) {
    return (req, res, next) => {
        const errors = [];
        if (schema.body) {
            const { error } = schema.body.validate(req.body);
            if (error) {
                errors.push(`Body: ${error.details[0].message}`);
            }
        }
        if (schema.query) {
            const { error } = schema.query.validate(req.query);
            if (error) {
                errors.push(`Query: ${error.details[0].message}`);
            }
        }
        if (schema.params) {
            const { error } = schema.params.validate(req.params);
            if (error) {
                errors.push(`Params: ${error.details[0].message}`);
            }
        }
        if (schema.headers) {
            const { error } = schema.headers.validate(req.headers);
            if (error) {
                errors.push(`Headers: ${error.details[0].message}`);
            }
        }
        if (errors.length > 0) {
            res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: errors
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        next();
    };
}
exports.validationSchemas = {
    auth: {
        register: {
            body: joi_1.default.object({
                email: joi_1.default.string().email().required().messages({
                    'string.email': 'Must be a valid email address',
                    'any.required': 'Email is required'
                }),
                password: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
                    'string.min': 'Password must be at least 8 characters long',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                    'any.required': 'Password is required'
                })
            })
        },
        login: {
            body: joi_1.default.object({
                email: joi_1.default.string().email().required(),
                password: joi_1.default.string().required()
            })
        },
        refresh: {
            body: joi_1.default.object({
                refreshToken: joi_1.default.string().required()
            })
        },
        google: {
            body: joi_1.default.object({
                idToken: joi_1.default.string().required().messages({
                    'any.required': 'Google ID token is required'
                })
            })
        },
        forgotPassword: {
            body: joi_1.default.object({
                email: joi_1.default.string().email().required().messages({
                    'string.email': 'Must be a valid email address',
                    'any.required': 'Email is required'
                })
            })
        },
        verifyOtp: {
            body: joi_1.default.object({
                email: joi_1.default.string().email().required(),
                otp: joi_1.default.string().length(6).pattern(/^\d+$/).required().messages({
                    'string.length': 'OTP must be 6 digits',
                    'string.pattern.base': 'OTP must contain only numbers'
                })
            })
        },
        verifyEmail: {
            body: joi_1.default.object({
                email: joi_1.default.string().email().required(),
                otp: joi_1.default.string().length(6).pattern(/^\d+$/).required().messages({
                    'string.length': 'OTP must be 6 digits',
                    'string.pattern.base': 'OTP must contain only numbers'
                })
            })
        },
        resendVerification: {
            body: joi_1.default.object({
                email: joi_1.default.string().email().required().messages({
                    'string.email': 'Must be a valid email address',
                    'any.required': 'Email is required'
                })
            })
        },
        resetPassword: {
            body: joi_1.default.object({
                resetToken: joi_1.default.string().required(),
                newPassword: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
                    'string.min': 'Password must be at least 8 characters long',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                    'any.required': 'New password is required'
                })
            })
        },
        changePassword: {
            body: joi_1.default.object({
                currentPassword: joi_1.default.string().required().messages({
                    'any.required': 'Current password is required'
                }),
                newPassword: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
                    'string.min': 'New password must be at least 8 characters long',
                    'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                    'any.required': 'New password is required'
                })
            })
        },
        changeEmailRequest: {
            body: joi_1.default.object({
                newEmail: joi_1.default.string().email().required().messages({
                    'string.email': 'Must be a valid email address',
                    'any.required': 'New email is required'
                }),
                password: joi_1.default.string().required().messages({
                    'any.required': 'Password is required to verify your identity'
                })
            })
        },
        changeEmailConfirm: {
            body: joi_1.default.object({
                otp: joi_1.default.string().length(6).pattern(/^\d+$/).required().messages({
                    'string.length': 'OTP must be 6 digits',
                    'string.pattern.base': 'OTP must contain only numbers'
                })
            })
        },
        changeEmailResend: {
            body: joi_1.default.object({})
        }
    },
    profile: {
        update: {
            body: joi_1.default.object({
                fullName: joi_1.default.string().max(100).trim().optional(),
                currentJobTitle: joi_1.default.string().max(100).trim().optional(),
                currentCompany: joi_1.default.string().max(100).trim().optional(),
                school: joi_1.default.string().max(200).trim().optional(),
                degreeInfo: joi_1.default.string().max(200).trim().optional(),
                previousJobTitles: joi_1.default.array().items(joi_1.default.string().max(100).trim()).optional(),
                targetIndustry: joi_1.default.string().max(100).trim().optional(),
                targetJobTitle: joi_1.default.string().max(100).trim().optional(),
                experienceLevel: joi_1.default.string().max(50).trim().optional()
            }).min(1)
        },
        targetRole: {
            body: joi_1.default.object({
                targetIndustry: joi_1.default.string().required(),
                targetJobTitle: joi_1.default.string().required()
            })
        }
    },
    sessions: {
        sessionId: {
            params: joi_1.default.object({
                id: joi_1.default.string().pattern(/^c[a-z0-9]{24}$/).required().messages({
                    'string.pattern.base': 'Session ID must be a valid CUID',
                    'any.required': 'Session ID is required'
                })
            })
        },
        updateTranscript: {
            params: joi_1.default.object({
                id: joi_1.default.string().pattern(/^c[a-z0-9]{24}$/).required().messages({
                    'string.pattern.base': 'Session ID must be a valid CUID',
                    'any.required': 'Session ID is required'
                })
            }),
            body: joi_1.default.object({
                transcript: joi_1.default.string().min(1).max(50000).trim().optional().messages({
                    'string.min': 'Transcript cannot be empty'
                }),
                conversation: joi_1.default.object({
                    participants: joi_1.default.object({
                        candidate: joi_1.default.object({
                            id: joi_1.default.string().max(64).trim().required(),
                            displayName: joi_1.default.string().max(80).trim().optional()
                        }).required(),
                        interviewers: joi_1.default.array().items(joi_1.default.object({
                            id: joi_1.default.string().max(64).trim().required(),
                            displayName: joi_1.default.string().max(80).trim().optional()
                        })).min(1).max(5).required()
                    }).optional(),
                    messages: joi_1.default.array().items(joi_1.default.object({
                        id: joi_1.default.string().max(80).trim().required(),
                        role: joi_1.default.string().valid('interviewer', 'candidate', 'other', 'unknown').required(),
                        speakerId: joi_1.default.string().max(64).trim().required(),
                        text: joi_1.default.string().min(1).max(50000).trim().required(),
                        startMs: joi_1.default.number().integer().min(0).optional(),
                        endMs: joi_1.default.number().integer().min(0).optional(),
                        edited: joi_1.default.object({
                            isEdited: joi_1.default.boolean().required(),
                            editedText: joi_1.default.string().max(50000).allow('').optional()
                        }).required(),
                        feedback: joi_1.default.object({
                            flag: joi_1.default.string().valid('Good', 'Improvement', 'Neutral').required()
                        }).optional(),
                        candidateFeedback: joi_1.default.object({
                            flag: joi_1.default.string().valid('Good', 'Improvement', 'Neutral').required()
                        }).optional()
                    })).min(1).max(1200).required()
                }).optional()
            })
                .or('transcript', 'conversation')
                .messages({
                'object.missing': 'Either transcript or conversation is required'
            })
        },
        updateDisplayName: {
            params: joi_1.default.object({
                id: joi_1.default.string().pattern(/^c[a-z0-9]{24}$/).required().messages({
                    'string.pattern.base': 'Session ID must be a valid CUID',
                    'any.required': 'Session ID is required'
                })
            }),
            body: joi_1.default.object({
                displayName: joi_1.default.string().max(200).trim().allow('').optional()
            }).min(1)
        },
        history: {
            query: joi_1.default.object({
                limit: joi_1.default.number().integer().min(1).max(100).optional(),
                offset: joi_1.default.number().integer().min(0).optional(),
                status: joi_1.default.string().valid('completed', 'processing', 'failed', 'pending', 'all').optional()
            })
        }
    },
    subscription: {
        upgrade: {
            body: joi_1.default.object({
                tier: joi_1.default.string().valid('FREE', 'PAID').required()
            })
        }
    },
    dashboard: {
        insights: {
            query: joi_1.default.object({
                limit: joi_1.default.number().integer().min(1).max(50).optional()
            })
        },
        trends: {
            query: joi_1.default.object({
                days: joi_1.default.number().integer().min(1).max(365).optional()
            })
        }
    },
    admin: {
        resetUsage: {
            body: joi_1.default.object({
                month: joi_1.default.number().integer().min(1).max(12).optional(),
                year: joi_1.default.number().integer().min(2020).max(2030).optional()
            })
        },
        users: {
            query: joi_1.default.object({
                limit: joi_1.default.number().integer().min(1).max(100).optional(),
                offset: joi_1.default.number().integer().min(0).optional(),
                tier: joi_1.default.string().valid('FREE', 'PAID').optional()
            })
        }
    }
};
exports.fileValidation = {
    resume: {
        allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 10 * 1024 * 1024,
        validate: (file) => {
            if (!exports.fileValidation.resume.allowedTypes.includes(file.mimetype)) {
                throw new auth_1.ValidationError('Invalid file type. Only PDF and Word documents are allowed.');
            }
            if (file.size > exports.fileValidation.resume.maxSize) {
                throw new auth_1.ValidationError('File too large. Maximum size is 10MB.');
            }
        }
    },
    audio: {
        allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'],
        maxSize: constants_1.FILE_SIZE_LIMITS.AUDIO,
        validate: (file) => {
            if (!exports.fileValidation.audio.allowedTypes.includes(file.mimetype)) {
                throw new auth_1.ValidationError('Invalid audio file type. Only MP3, WAV, MP4, and WebM are allowed.');
            }
            if (file.size > exports.fileValidation.audio.maxSize) {
                throw new auth_1.ValidationError('Audio file too large. Maximum size is 25MB (Whisper API limit).');
            }
        }
    }
};
function sanitizeInput(req, res, next) {
    const sanitizeObject = (obj) => {
        if (typeof obj === 'string') {
            return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
            return sanitized;
        }
        return obj;
    };
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    next();
}
function validateRateLimit(windowMs, maxRequests) {
    const requests = new Map();
    return (req, res, next) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;
        for (const [key, value] of requests.entries()) {
            if (value.resetTime < windowStart) {
                requests.delete(key);
            }
        }
        const clientData = requests.get(clientId);
        if (!clientData) {
            requests.set(clientId, { count: 1, resetTime: now + windowMs });
            return next();
        }
        if (clientData.count >= maxRequests) {
            return res.status(429).json({
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests. Please try again later.',
                    retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
        }
        clientData.count++;
        next();
    };
}
//# sourceMappingURL=validation.js.map