export interface Config {
    NODE_ENV: string;
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    OPENAI_API_KEY: string;
    WHISPER_API_KEY: string;
    OPENAI_MODEL: string;
    OPENAI_MAX_TOKENS: number;
    OPENAI_TEMPERATURE: number;
    OPENAI_CONTEXT_LIMIT?: number;
    ANALYSIS_TIER_S_MAX_INPUT_TOKENS: number;
    ANALYSIS_PROMPT_VERSION: string;
    ENABLE_LONG_TRANSCRIPT_PIPELINE: boolean;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_REGION: string;
    AWS_S3_BUCKET: string;
    CORS_ORIGIN: string;
    ADMIN_EMAILS?: string;
    ADMIN_DOMAINS?: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    AUTH_RATE_LIMIT_WINDOW_MS: number;
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: number;
    MAX_FILE_SIZE: number;
    ALLOWED_FILE_TYPES: string;
    FREE_TIER_MONTHLY_LIMIT: number;
    PAID_TIER_MONTHLY_LIMIT: number;
    LOG_LEVEL: string;
    ENABLE_REQUEST_LOGGING: boolean;
    ENABLE_PERFORMANCE_MONITORING: boolean;
    REDIS_URL?: string;
    SENTRY_DSN?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM_ADDRESS?: string;
    EMAIL_FROM_NAME?: string;
    ENABLE_RATE_LIMITING: boolean;
    ENABLE_ABUSE_DETECTION: boolean;
    ENABLE_ADMIN_ENDPOINTS: boolean;
}
export declare const config: Config;
export declare function validateConfig(): {
    isValid: boolean;
    errors: string[];
};
export declare function getConfig<K extends keyof Config>(key: K): Config[K];
export declare function isFeatureEnabled(feature: keyof Pick<Config, 'ENABLE_RATE_LIMITING' | 'ENABLE_ABUSE_DETECTION' | 'ENABLE_ADMIN_ENDPOINTS'>): boolean;
export declare function getAdminEmails(): string[];
export declare function getAdminDomains(): string[];
export declare function getAllowedFileTypes(): string[];
declare class RuntimeConfig {
    private runtimeSettings;
    set(key: string, value: any): void;
    get(key: string): any;
    has(key: string): boolean;
    getAll(): Record<string, any>;
    reset(key?: string): void;
}
export declare const runtimeConfig: RuntimeConfig;
export declare function checkConfigHealth(): {
    healthy: boolean;
    issues: string[];
};
export default config;
//# sourceMappingURL=config.d.ts.map