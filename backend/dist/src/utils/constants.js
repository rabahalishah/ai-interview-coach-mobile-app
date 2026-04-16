"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_RESPONSE_FORMATS = exports.DATE_FORMATS = exports.REGEX_PATTERNS = exports.ENV_DEFAULTS = exports.HTTP_STATUS = exports.SUCCESS_MESSAGES = exports.ERROR_MESSAGES = exports.S3_CONFIG = exports.OPENAI_MODELS = exports.PAGINATION = exports.CACHE_DURATIONS = exports.VALIDATION_LIMITS = exports.PRESIGNED_URL_CONFIG = exports.RETRY_CONFIG = exports.SERVICE_TIMEOUTS = exports.RATE_LIMITS = exports.PASSWORD_CONFIG = exports.JWT_CONFIG = exports.SUBSCRIPTION_TIERS = exports.SESSION_STATUSES = exports.EXPERIENCE_LEVELS = exports.SCORE_CATEGORIES = exports.SCORE_RANGES = exports.FILE_SIZE_LIMITS = exports.ALLOWED_RESUME_TYPES = exports.ALLOWED_AUDIO_TYPES = exports.SUBSCRIPTION_LIMITS = exports.WHISPER_MAX_AUDIO_BYTES = void 0;
exports.WHISPER_MAX_AUDIO_BYTES = 25 * 1024 * 1024;
exports.SUBSCRIPTION_LIMITS = {
    FREE: {
        MONTHLY_SESSIONS: 3,
        MAX_FILE_SIZE: exports.WHISPER_MAX_AUDIO_BYTES,
        MAX_AUDIO_DURATION: 10 * 60
    },
    PAID: {
        MONTHLY_SESSIONS: -1,
        MAX_FILE_SIZE: exports.WHISPER_MAX_AUDIO_BYTES,
        MAX_AUDIO_DURATION: 30 * 60
    }
};
exports.ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/m4a',
    'audio/aac',
    'audio/ogg'
];
exports.ALLOWED_RESUME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
exports.FILE_SIZE_LIMITS = {
    AUDIO: exports.WHISPER_MAX_AUDIO_BYTES,
    RESUME: 10 * 1024 * 1024,
    AVATAR: 5 * 1024 * 1024
};
exports.SCORE_RANGES = {
    MIN: 1,
    MAX: 5,
    EXCELLENT: 5,
    GOOD: 4,
    FAIR: 3,
    POOR: 2
};
exports.SCORE_CATEGORIES = [
    'clarity',
    'confidence',
    'tone',
    'enthusiasm',
    'specificity'
];
exports.EXPERIENCE_LEVELS = [
    'entry',
    'junior',
    'mid',
    'senior',
    'lead',
    'executive'
];
exports.SESSION_STATUSES = [
    'pending',
    'processing',
    'completed',
    'failed'
];
exports.SUBSCRIPTION_TIERS = [
    'free',
    'paid'
];
exports.JWT_CONFIG = {
    DEFAULT_EXPIRES_IN: '24h',
    REFRESH_EXPIRES_IN: '7d',
    ALGORITHM: 'HS256',
    ISSUER: 'ai-audio-summarization'
};
exports.PASSWORD_CONFIG = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    SALT_ROUNDS: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true
};
exports.RATE_LIMITS = {
    AUTH: {
        WINDOW_MS: 15 * 60 * 1000,
        MAX_REQUESTS: 5
    },
    API: {
        WINDOW_MS: 15 * 60 * 1000,
        MAX_REQUESTS: 100
    },
    UPLOAD: {
        WINDOW_MS: 60 * 1000,
        MAX_REQUESTS: 10
    }
};
exports.SERVICE_TIMEOUTS = {
    OPENAI: {
        WHISPER: 60000,
        GPT: 30000,
        MAX_RETRIES: 3
    },
    S3: {
        UPLOAD: 30000,
        DOWNLOAD: 15000,
        MAX_RETRIES: 2
    },
    DATABASE: {
        QUERY: 10000,
        TRANSACTION: 30000
    }
};
exports.RETRY_CONFIG = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 1000,
    DELAYS_MS: [1000, 2000, 4000],
    MAX_DELAY_MS: 4000,
    RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504],
    RETRYABLE_S3_CODES: [500, 503],
    NON_RETRYABLE_S3_CODES: [400, 403, 404]
};
exports.PRESIGNED_URL_CONFIG = {
    MIN_EXPIRATION_SECONDS: 1,
    MAX_EXPIRATION_SECONDS: 86400,
    DEFAULT_DOWNLOAD_EXPIRATION: 3600,
    DEFAULT_UPLOAD_EXPIRATION: 3600,
    RESUME_EXPIRATION: 3600
};
exports.VALIDATION_LIMITS = {
    AUDIO: {
        MIN_SIZE_BYTES: 100,
        MAX_SIZE_BYTES: exports.WHISPER_MAX_AUDIO_BYTES,
        MIN_DURATION_SECONDS: 1,
        MAX_DURATION_SECONDS: 30 * 60
    },
    TEXT: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 100000,
        MAX_TOKENS: 8000,
        MIN_TOKENS: 1
    },
    FILE: {
        MIN_SIZE_BYTES: 100,
        MAX_RESUME_SIZE_BYTES: 10 * 1024 * 1024,
        MAX_AUDIO_SIZE_BYTES: exports.WHISPER_MAX_AUDIO_BYTES,
        MAX_AVATAR_SIZE_BYTES: 5 * 1024 * 1024
    },
    FILENAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 255,
        ALLOWED_CHARS_REGEX: /^[a-zA-Z0-9._-]+$/
    }
};
exports.CACHE_DURATIONS = {
    USER_PROFILE: 300,
    DASHBOARD_STATS: 600,
    SYSTEM_SETTINGS: 3600,
    INDUSTRIES: 86400
};
exports.PAGINATION = {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_OFFSET: 0
};
exports.OPENAI_MODELS = {
    WHISPER: 'whisper-1',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo-preview'
};
exports.S3_CONFIG = {
    AUDIO_PREFIX: 'audio/',
    RESUME_PREFIX: 'resumes/',
    AVATAR_PREFIX: 'avatars/',
    SIGNED_URL_EXPIRES: 3600,
    MULTIPART_THRESHOLD: 100 * 1024 * 1024,
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    MAX_AUDIO_FILE_SIZE: exports.WHISPER_MAX_AUDIO_BYTES,
    ALLOWED_FILE_TYPES: ['.pdf', '.doc', '.docx'],
    ALLOWED_AUDIO_TYPES: ['.mp3', '.wav', '.m4a', '.ogg'],
    CLEANUP_BATCH_SIZE: 100,
    CLEANUP_AGE_DAYS: 30,
    PRESIGNED_URL: {
        MIN_EXPIRATION: 1,
        MAX_EXPIRATION: 86400,
        DEFAULT_EXPIRATION: 3600
    }
};
exports.ERROR_MESSAGES = {
    VALIDATION: {
        REQUIRED_FIELD: 'This field is required',
        INVALID_EMAIL: 'Please provide a valid email address',
        INVALID_PASSWORD: 'Password does not meet requirements',
        INVALID_UUID: 'Invalid ID format',
        FILE_TOO_LARGE: 'File size exceeds maximum allowed',
        INVALID_FILE_TYPE: 'File type not supported'
    },
    AUTH: {
        INVALID_CREDENTIALS: 'Invalid email or password',
        TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
        TOKEN_INVALID: 'Invalid authentication token',
        ACCESS_DENIED: 'Access denied',
        ACCOUNT_NOT_FOUND: 'Account not found'
    },
    SUBSCRIPTION: {
        LIMIT_EXCEEDED: 'Monthly session limit exceeded',
        UPGRADE_REQUIRED: 'Upgrade required for this feature',
        INVALID_TIER: 'Invalid subscription tier'
    },
    EXTERNAL: {
        OPENAI_ERROR: 'AI service temporarily unavailable',
        S3_ERROR: 'File storage service error',
        TRANSCRIPTION_FAILED: 'Audio transcription failed',
        ANALYSIS_FAILED: 'AI analysis failed'
    },
    GENERAL: {
        NOT_FOUND: 'Resource not found',
        INTERNAL_ERROR: 'An unexpected error occurred',
        SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
        REQUEST_TIMEOUT: 'Request timed out'
    }
};
exports.SUCCESS_MESSAGES = {
    AUTH: {
        REGISTRATION_SUCCESS: 'Account created successfully',
        LOGIN_SUCCESS: 'Logged in successfully',
        LOGOUT_SUCCESS: 'Logged out successfully',
        PASSWORD_UPDATED: 'Password updated successfully'
    },
    PROFILE: {
        UPDATED: 'Profile updated successfully',
        RESUME_UPLOADED: 'Resume uploaded successfully',
        TARGET_ROLE_SET: 'Target role updated successfully'
    },
    SESSION: {
        STARTED: 'Session started successfully',
        AUDIO_UPLOADED: 'Audio uploaded successfully',
        PROCESSING_COMPLETE: 'Analysis complete'
    },
    SUBSCRIPTION: {
        UPGRADED: 'Subscription upgraded successfully',
        DOWNGRADED: 'Subscription downgraded successfully'
    }
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};
exports.ENV_DEFAULTS = {
    PORT: 3000,
    NODE_ENV: 'development',
    JWT_EXPIRES_IN: '24h',
    BCRYPT_SALT_ROUNDS: 12,
    CORS_ORIGIN: '*',
    LOG_LEVEL: 'info',
    MAX_REQUEST_SIZE: '10mb',
    REQUEST_TIMEOUT: 30000
};
exports.REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    PHONE: /^\+?[\d\s\-\(\)]+$/,
    URL: /^https?:\/\/.+/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
};
exports.DATE_FORMATS = {
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    DATE_ONLY: 'YYYY-MM-DD',
    TIME_ONLY: 'HH:mm:ss',
    DISPLAY: 'MMM DD, YYYY',
    DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm'
};
exports.API_RESPONSE_FORMATS = {
    SUCCESS: {
        status: 'success',
        data: null,
        message: null
    },
    ERROR: {
        status: 'error',
        error: {
            code: null,
            message: null,
            details: null
        },
        timestamp: null,
        path: null
    }
};
//# sourceMappingURL=constants.js.map