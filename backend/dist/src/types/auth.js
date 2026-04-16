"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServiceError = exports.ConflictError = exports.NotFoundError = exports.EmailNotVerifiedError = exports.AuthenticationError = exports.ValidationError = exports.AppError = exports.ErrorCode = exports.SubscriptionTier = void 0;
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["PAID"] = "paid";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    ErrorCode["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["TOKEN_INVALID"] = "TOKEN_INVALID";
    ErrorCode["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    ErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    ErrorCode["EMAIL_NOT_VERIFIED"] = "EMAIL_NOT_VERIFIED";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ErrorCode["SESSION_NOT_FOUND"] = "SESSION_NOT_FOUND";
    ErrorCode["PROFILE_NOT_FOUND"] = "PROFILE_NOT_FOUND";
    ErrorCode["USAGE_LIMIT_ERROR"] = "USAGE_LIMIT_ERROR";
    ErrorCode["MONTHLY_LIMIT_EXCEEDED"] = "MONTHLY_LIMIT_EXCEEDED";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ErrorCode["OPENAI_API_ERROR"] = "OPENAI_API_ERROR";
    ErrorCode["S3_UPLOAD_ERROR"] = "S3_UPLOAD_ERROR";
    ErrorCode["TRANSCRIPTION_ERROR"] = "TRANSCRIPTION_ERROR";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class AppError extends Error {
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', details) {
        super(ErrorCode.AUTHENTICATION_ERROR, message, 401, details);
    }
}
exports.AuthenticationError = AuthenticationError;
class EmailNotVerifiedError extends AppError {
    constructor(message = 'Please verify your email before signing in', details) {
        super(ErrorCode.EMAIL_NOT_VERIFIED, message, 403, details);
    }
}
exports.EmailNotVerifiedError = EmailNotVerifiedError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', details) {
        super(ErrorCode.NOT_FOUND, message, 404, details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, details) {
        super(ErrorCode.CONFLICT, message, 409, details);
    }
}
exports.ConflictError = ConflictError;
class ExternalServiceError extends AppError {
    constructor(message = 'External service error', details) {
        super(ErrorCode.EXTERNAL_SERVICE_ERROR, message, 502, details);
    }
}
exports.ExternalServiceError = ExternalServiceError;
//# sourceMappingURL=auth.js.map