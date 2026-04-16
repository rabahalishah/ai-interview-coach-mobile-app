export declare const WHISPER_MAX_AUDIO_BYTES: number;
export declare const SUBSCRIPTION_LIMITS: {
    readonly FREE: {
        readonly MONTHLY_SESSIONS: 3;
        readonly MAX_FILE_SIZE: number;
        readonly MAX_AUDIO_DURATION: number;
    };
    readonly PAID: {
        readonly MONTHLY_SESSIONS: -1;
        readonly MAX_FILE_SIZE: number;
        readonly MAX_AUDIO_DURATION: number;
    };
};
export declare const ALLOWED_AUDIO_TYPES: readonly ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/aac", "audio/ogg"];
export declare const ALLOWED_RESUME_TYPES: readonly ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
export declare const FILE_SIZE_LIMITS: {
    readonly AUDIO: number;
    readonly RESUME: number;
    readonly AVATAR: number;
};
export declare const SCORE_RANGES: {
    readonly MIN: 1;
    readonly MAX: 5;
    readonly EXCELLENT: 5;
    readonly GOOD: 4;
    readonly FAIR: 3;
    readonly POOR: 2;
};
export declare const SCORE_CATEGORIES: readonly ["clarity", "confidence", "tone", "enthusiasm", "specificity"];
export declare const EXPERIENCE_LEVELS: readonly ["entry", "junior", "mid", "senior", "lead", "executive"];
export declare const SESSION_STATUSES: readonly ["pending", "processing", "completed", "failed"];
export declare const SUBSCRIPTION_TIERS: readonly ["free", "paid"];
export declare const JWT_CONFIG: {
    readonly DEFAULT_EXPIRES_IN: "24h";
    readonly REFRESH_EXPIRES_IN: "7d";
    readonly ALGORITHM: "HS256";
    readonly ISSUER: "ai-audio-summarization";
};
export declare const PASSWORD_CONFIG: {
    readonly MIN_LENGTH: 8;
    readonly MAX_LENGTH: 128;
    readonly SALT_ROUNDS: 12;
    readonly REQUIRE_UPPERCASE: true;
    readonly REQUIRE_LOWERCASE: true;
    readonly REQUIRE_NUMBERS: true;
    readonly REQUIRE_SPECIAL_CHARS: true;
};
export declare const RATE_LIMITS: {
    readonly AUTH: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 5;
    };
    readonly API: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 100;
    };
    readonly UPLOAD: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 10;
    };
};
export declare const SERVICE_TIMEOUTS: {
    readonly OPENAI: {
        readonly WHISPER: 60000;
        readonly GPT: 30000;
        readonly MAX_RETRIES: 3;
    };
    readonly S3: {
        readonly UPLOAD: 30000;
        readonly DOWNLOAD: 15000;
        readonly MAX_RETRIES: 2;
    };
    readonly DATABASE: {
        readonly QUERY: 10000;
        readonly TRANSACTION: 30000;
    };
};
export declare const RETRY_CONFIG: {
    readonly MAX_ATTEMPTS: 3;
    readonly INITIAL_DELAY_MS: 1000;
    readonly DELAYS_MS: readonly [1000, 2000, 4000];
    readonly MAX_DELAY_MS: 4000;
    readonly RETRYABLE_STATUS_CODES: readonly [429, 500, 502, 503, 504];
    readonly RETRYABLE_S3_CODES: readonly [500, 503];
    readonly NON_RETRYABLE_S3_CODES: readonly [400, 403, 404];
};
export declare const PRESIGNED_URL_CONFIG: {
    readonly MIN_EXPIRATION_SECONDS: 1;
    readonly MAX_EXPIRATION_SECONDS: 86400;
    readonly DEFAULT_DOWNLOAD_EXPIRATION: 3600;
    readonly DEFAULT_UPLOAD_EXPIRATION: 3600;
    readonly RESUME_EXPIRATION: 3600;
};
export declare const VALIDATION_LIMITS: {
    readonly AUDIO: {
        readonly MIN_SIZE_BYTES: 100;
        readonly MAX_SIZE_BYTES: number;
        readonly MIN_DURATION_SECONDS: 1;
        readonly MAX_DURATION_SECONDS: number;
    };
    readonly TEXT: {
        readonly MIN_LENGTH: 1;
        readonly MAX_LENGTH: 100000;
        readonly MAX_TOKENS: 8000;
        readonly MIN_TOKENS: 1;
    };
    readonly FILE: {
        readonly MIN_SIZE_BYTES: 100;
        readonly MAX_RESUME_SIZE_BYTES: number;
        readonly MAX_AUDIO_SIZE_BYTES: number;
        readonly MAX_AVATAR_SIZE_BYTES: number;
    };
    readonly FILENAME: {
        readonly MIN_LENGTH: 1;
        readonly MAX_LENGTH: 255;
        readonly ALLOWED_CHARS_REGEX: RegExp;
    };
};
export declare const CACHE_DURATIONS: {
    readonly USER_PROFILE: 300;
    readonly DASHBOARD_STATS: 600;
    readonly SYSTEM_SETTINGS: 3600;
    readonly INDUSTRIES: 86400;
};
export declare const PAGINATION: {
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
    readonly DEFAULT_OFFSET: 0;
};
export declare const OPENAI_MODELS: {
    readonly WHISPER: "whisper-1";
    readonly GPT_3_5_TURBO: "gpt-3.5-turbo";
    readonly GPT_4: "gpt-4";
    readonly GPT_4_TURBO: "gpt-4-turbo-preview";
};
export declare const S3_CONFIG: {
    AUDIO_PREFIX: string;
    RESUME_PREFIX: string;
    AVATAR_PREFIX: string;
    SIGNED_URL_EXPIRES: number;
    MULTIPART_THRESHOLD: number;
    MAX_FILE_SIZE: number;
    MAX_AUDIO_FILE_SIZE: number;
    ALLOWED_FILE_TYPES: string[];
    ALLOWED_AUDIO_TYPES: string[];
    CLEANUP_BATCH_SIZE: number;
    CLEANUP_AGE_DAYS: number;
    PRESIGNED_URL: {
        MIN_EXPIRATION: number;
        MAX_EXPIRATION: number;
        DEFAULT_EXPIRATION: number;
    };
};
export declare const ERROR_MESSAGES: {
    readonly VALIDATION: {
        readonly REQUIRED_FIELD: "This field is required";
        readonly INVALID_EMAIL: "Please provide a valid email address";
        readonly INVALID_PASSWORD: "Password does not meet requirements";
        readonly INVALID_UUID: "Invalid ID format";
        readonly FILE_TOO_LARGE: "File size exceeds maximum allowed";
        readonly INVALID_FILE_TYPE: "File type not supported";
    };
    readonly AUTH: {
        readonly INVALID_CREDENTIALS: "Invalid email or password";
        readonly TOKEN_EXPIRED: "Your session has expired. Please log in again.";
        readonly TOKEN_INVALID: "Invalid authentication token";
        readonly ACCESS_DENIED: "Access denied";
        readonly ACCOUNT_NOT_FOUND: "Account not found";
    };
    readonly SUBSCRIPTION: {
        readonly LIMIT_EXCEEDED: "Monthly session limit exceeded";
        readonly UPGRADE_REQUIRED: "Upgrade required for this feature";
        readonly INVALID_TIER: "Invalid subscription tier";
    };
    readonly EXTERNAL: {
        readonly OPENAI_ERROR: "AI service temporarily unavailable";
        readonly S3_ERROR: "File storage service error";
        readonly TRANSCRIPTION_FAILED: "Audio transcription failed";
        readonly ANALYSIS_FAILED: "AI analysis failed";
    };
    readonly GENERAL: {
        readonly NOT_FOUND: "Resource not found";
        readonly INTERNAL_ERROR: "An unexpected error occurred";
        readonly SERVICE_UNAVAILABLE: "Service temporarily unavailable";
        readonly REQUEST_TIMEOUT: "Request timed out";
    };
};
export declare const SUCCESS_MESSAGES: {
    readonly AUTH: {
        readonly REGISTRATION_SUCCESS: "Account created successfully";
        readonly LOGIN_SUCCESS: "Logged in successfully";
        readonly LOGOUT_SUCCESS: "Logged out successfully";
        readonly PASSWORD_UPDATED: "Password updated successfully";
    };
    readonly PROFILE: {
        readonly UPDATED: "Profile updated successfully";
        readonly RESUME_UPLOADED: "Resume uploaded successfully";
        readonly TARGET_ROLE_SET: "Target role updated successfully";
    };
    readonly SESSION: {
        readonly STARTED: "Session started successfully";
        readonly AUDIO_UPLOADED: "Audio uploaded successfully";
        readonly PROCESSING_COMPLETE: "Analysis complete";
    };
    readonly SUBSCRIPTION: {
        readonly UPGRADED: "Subscription upgraded successfully";
        readonly DOWNGRADED: "Subscription downgraded successfully";
    };
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
    readonly GATEWAY_TIMEOUT: 504;
};
export declare const ENV_DEFAULTS: {
    readonly PORT: 3000;
    readonly NODE_ENV: "development";
    readonly JWT_EXPIRES_IN: "24h";
    readonly BCRYPT_SALT_ROUNDS: 12;
    readonly CORS_ORIGIN: "*";
    readonly LOG_LEVEL: "info";
    readonly MAX_REQUEST_SIZE: "10mb";
    readonly REQUEST_TIMEOUT: 30000;
};
export declare const REGEX_PATTERNS: {
    readonly EMAIL: RegExp;
    readonly UUID: RegExp;
    readonly PASSWORD: RegExp;
    readonly PHONE: RegExp;
    readonly URL: RegExp;
    readonly SLUG: RegExp;
};
export declare const DATE_FORMATS: {
    readonly ISO: "YYYY-MM-DDTHH:mm:ss.SSSZ";
    readonly DATE_ONLY: "YYYY-MM-DD";
    readonly TIME_ONLY: "HH:mm:ss";
    readonly DISPLAY: "MMM DD, YYYY";
    readonly DISPLAY_WITH_TIME: "MMM DD, YYYY HH:mm";
};
export declare const API_RESPONSE_FORMATS: {
    readonly SUCCESS: {
        readonly status: "success";
        readonly data: null;
        readonly message: null;
    };
    readonly ERROR: {
        readonly status: "error";
        readonly error: {
            readonly code: null;
            readonly message: null;
            readonly details: null;
        };
        readonly timestamp: null;
        readonly path: null;
    };
};
//# sourceMappingURL=constants.d.ts.map