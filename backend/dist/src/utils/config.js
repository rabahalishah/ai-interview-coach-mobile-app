"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeConfig = exports.config = void 0;
exports.validateConfig = validateConfig;
exports.getConfig = getConfig;
exports.isFeatureEnabled = isFeatureEnabled;
exports.getAdminEmails = getAdminEmails;
exports.getAdminDomains = getAdminDomains;
exports.getAllowedFileTypes = getAllowedFileTypes;
exports.checkConfigHealth = checkConfigHealth;
const dotenv_1 = __importDefault(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
dotenv_1.default.config();
const configSchema = joi_1.default.object({
    NODE_ENV: joi_1.default.string().valid('development', 'test', 'production').default('development'),
    PORT: joi_1.default.number().port().default(3000),
    DATABASE_URL: joi_1.default.string().uri().required(),
    JWT_SECRET: joi_1.default.string().min(32).required(),
    JWT_EXPIRES_IN: joi_1.default.string().default('24h'),
    JWT_REFRESH_EXPIRES_IN: joi_1.default.string().default('7d'),
    OPENAI_API_KEY: joi_1.default.string().required(),
    WHISPER_API_KEY: joi_1.default.string().required(),
    OPENAI_MODEL: joi_1.default.string().default('gpt-5-mini'),
    OPENAI_MAX_TOKENS: joi_1.default.number().integer().min(1).default(1000),
    OPENAI_TEMPERATURE: joi_1.default.number().min(0).max(2).default(0.7),
    OPENAI_CONTEXT_LIMIT: joi_1.default.number().integer().min(1).optional(),
    OPENAI_WHISPER_TIMEOUT_MS: joi_1.default.number().integer().min(1000).max(600000).optional(),
    ANALYSIS_TIER_S_MAX_INPUT_TOKENS: joi_1.default.number().integer().min(1024).default(48000),
    ANALYSIS_PROMPT_VERSION: joi_1.default.string().max(64).default('1'),
    ENABLE_LONG_TRANSCRIPT_PIPELINE: joi_1.default.boolean().truthy('true', '1', 'yes').falsy('false', '0', 'no').default(false),
    AWS_ACCESS_KEY_ID: joi_1.default.string().required(),
    AWS_SECRET_ACCESS_KEY: joi_1.default.string().required(),
    AWS_REGION: joi_1.default.string().default('us-east-1'),
    AWS_S3_BUCKET: joi_1.default.string().required(),
    CORS_ORIGIN: joi_1.default.string().default('*'),
    ADMIN_EMAILS: joi_1.default.string().optional(),
    ADMIN_DOMAINS: joi_1.default.string().optional(),
    RATE_LIMIT_WINDOW_MS: joi_1.default.number().integer().min(1000).default(60000),
    RATE_LIMIT_MAX_REQUESTS: joi_1.default.number().integer().min(1).default(100),
    AUTH_RATE_LIMIT_WINDOW_MS: joi_1.default.number().integer().min(1000).default(900000),
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: joi_1.default.number().integer().min(1).default(10),
    MAX_FILE_SIZE: joi_1.default.number().integer().min(1).default(50 * 1024 * 1024),
    ALLOWED_FILE_TYPES: joi_1.default.string().default('pdf,doc,docx,mp3,wav,m4a'),
    FREE_TIER_MONTHLY_LIMIT: joi_1.default.number().integer().min(0).default(3),
    PAID_TIER_MONTHLY_LIMIT: joi_1.default.number().integer().min(-1).default(-1),
    LOG_LEVEL: joi_1.default.string().valid('error', 'warn', 'info', 'debug').default('info'),
    ENABLE_REQUEST_LOGGING: joi_1.default.boolean().default(true),
    ENABLE_PERFORMANCE_MONITORING: joi_1.default.boolean().default(true),
    REDIS_URL: joi_1.default.string().uri().optional(),
    SENTRY_DSN: joi_1.default.string().uri().optional(),
    GOOGLE_CLIENT_ID: joi_1.default.string().optional(),
    GOOGLE_CLIENT_SECRET: joi_1.default.string().optional(),
    RESEND_API_KEY: joi_1.default.string().optional(),
    EMAIL_FROM_ADDRESS: joi_1.default.string().email().optional(),
    EMAIL_FROM_NAME: joi_1.default.string().optional(),
    ENABLE_RATE_LIMITING: joi_1.default.boolean().default(true),
    ENABLE_ABUSE_DETECTION: joi_1.default.boolean().default(true),
    ENABLE_ADMIN_ENDPOINTS: joi_1.default.boolean().default(true)
}).unknown(true);
function loadConfig() {
    const { error, value } = configSchema.validate(process.env, {
        abortEarly: false,
        stripUnknown: false
    });
    if (error) {
        const errorMessages = error.details.map(detail => `${detail.path.join('.')}: ${detail.message}`).join('\n');
        throw new Error(`Configuration validation failed:\n${errorMessages}`);
    }
    return value;
}
exports.config = loadConfig();
function validateConfig() {
    try {
        loadConfig();
        return { isValid: true, errors: [] };
    }
    catch (error) {
        const errorMessage = error.message;
        const errors = errorMessage.includes('Configuration validation failed:')
            ? errorMessage.split('\n').slice(1)
            : [errorMessage];
        return { isValid: false, errors };
    }
}
function getConfig(key) {
    return exports.config[key];
}
function isFeatureEnabled(feature) {
    return exports.config[feature];
}
function getAdminEmails() {
    if (!exports.config.ADMIN_EMAILS) {
        return [];
    }
    return exports.config.ADMIN_EMAILS.split(',').map(email => email.trim()).filter(Boolean);
}
function getAdminDomains() {
    if (!exports.config.ADMIN_DOMAINS) {
        return [];
    }
    return exports.config.ADMIN_DOMAINS.split(',').map(domain => domain.trim()).filter(Boolean);
}
function getAllowedFileTypes() {
    return exports.config.ALLOWED_FILE_TYPES.split(',').map(type => type.trim().toLowerCase()).filter(Boolean);
}
class RuntimeConfig {
    constructor() {
        this.runtimeSettings = new Map();
    }
    set(key, value) {
        const allowedRuntimeSettings = [
            'LOG_LEVEL',
            'ENABLE_REQUEST_LOGGING',
            'ENABLE_PERFORMANCE_MONITORING',
            'RATE_LIMIT_MAX_REQUESTS',
            'RATE_LIMIT_WINDOW_MS'
        ];
        if (!allowedRuntimeSettings.includes(key)) {
            throw new Error(`Runtime configuration update not allowed for: ${key}`);
        }
        this.runtimeSettings.set(key, value);
        console.log('Runtime configuration updated:', {
            key,
            value,
            timestamp: new Date().toISOString()
        });
    }
    get(key) {
        return this.runtimeSettings.get(key) ?? exports.config[key];
    }
    has(key) {
        return this.runtimeSettings.has(key);
    }
    getAll() {
        const result = {};
        for (const [key, value] of this.runtimeSettings.entries()) {
            result[key] = value;
        }
        return result;
    }
    reset(key) {
        if (key) {
            this.runtimeSettings.delete(key);
        }
        else {
            this.runtimeSettings.clear();
        }
    }
}
exports.runtimeConfig = new RuntimeConfig();
function checkConfigHealth() {
    const issues = [];
    const requiredVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'OPENAI_API_KEY',
        'WHISPER_API_KEY',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_S3_BUCKET'
    ];
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            issues.push(`Missing required environment variable: ${varName}`);
        }
    }
    if (exports.config.JWT_SECRET && exports.config.JWT_SECRET.length < 32) {
        issues.push('JWT_SECRET should be at least 32 characters long');
    }
    if (!exports.config.ADMIN_EMAILS && !exports.config.ADMIN_DOMAINS) {
        issues.push('No admin access configured (ADMIN_EMAILS or ADMIN_DOMAINS)');
    }
    if (exports.config.MAX_FILE_SIZE > 100 * 1024 * 1024) {
        issues.push('MAX_FILE_SIZE is very large, consider reducing for security');
    }
    return {
        healthy: issues.length === 0,
        issues
    };
}
exports.default = exports.config;
//# sourceMappingURL=config.js.map