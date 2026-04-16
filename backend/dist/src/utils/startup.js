"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartupValidator = void 0;
exports.runStartupValidation = runStartupValidation;
exports.getStartupValidator = getStartupValidator;
const config_1 = require("./config");
const MonitoringService_1 = require("../services/MonitoringService");
const prisma_1 = __importDefault(require("../lib/prisma"));
class StartupValidator {
    constructor() {
        this.validationResults = {};
    }
    static getInstance() {
        if (!StartupValidator.instance) {
            StartupValidator.instance = new StartupValidator();
        }
        return StartupValidator.instance;
    }
    async runStartupValidation() {
        console.log('🚀 Starting application validation...');
        const errors = [];
        try {
            console.log('📋 Validating configuration...');
            const configValidation = this.validateConfiguration();
            if (!configValidation.success) {
                errors.push(...configValidation.errors);
            }
            console.log('🗄️  Validating database connection...');
            const dbValidation = await this.validateDatabase();
            if (!dbValidation.success) {
                errors.push(...dbValidation.errors);
            }
            console.log('🌐 Validating external services...');
            const servicesValidation = await this.validateExternalServices();
            if (!servicesValidation.success) {
                errors.push(...servicesValidation.errors);
            }
            console.log('📊 Initializing monitoring...');
            const monitoringValidation = await this.initializeMonitoring();
            if (!monitoringValidation.success) {
                errors.push(...monitoringValidation.errors);
            }
            console.log('💻 Checking system resources...');
            const resourceValidation = this.validateSystemResources();
            if (!resourceValidation.success) {
                errors.push(...resourceValidation.errors);
            }
            const success = errors.length === 0;
            if (success) {
                console.log('✅ All startup validations passed');
            }
            else {
                console.error('❌ Startup validation failed with errors:');
                errors.forEach(error => console.error(`   - ${error}`));
            }
            return { success, errors };
        }
        catch (error) {
            const errorMessage = `Startup validation failed: ${error?.message || String(error) || 'Unknown error'}`;
            console.error('💥', errorMessage);
            return { success: false, errors: [errorMessage] };
        }
    }
    validateConfiguration() {
        try {
            const configValidation = (0, config_1.validateConfig)();
            if (!configValidation.isValid) {
                return { success: false, errors: configValidation.errors };
            }
            const configHealth = (0, config_1.checkConfigHealth)();
            if (!configHealth.healthy) {
                console.warn('⚠️  Configuration health warnings:');
                configHealth.issues.forEach(issue => console.warn(`   - ${issue}`));
            }
            this.validationResults.configuration = true;
            return { success: true, errors: [] };
        }
        catch (error) {
            const errorMessage = `Configuration validation failed: ${error?.message || String(error) || 'Unknown error'}`;
            return { success: false, errors: [errorMessage] };
        }
    }
    async validateDatabase() {
        try {
            await prisma_1.default.$queryRaw `SELECT 1`;
            const tableChecks = await Promise.all([
                prisma_1.default.user.findFirst().catch(() => null),
                prisma_1.default.userProfile.findFirst().catch(() => null),
                prisma_1.default.audioSession.findFirst().catch(() => null),
                prisma_1.default.usageTracking.findFirst().catch(() => null)
            ]);
            this.validationResults.database = true;
            return { success: true, errors: [] };
        }
        catch (error) {
            const errorMessage = `Database validation failed: ${error?.message || String(error) || 'Unknown error'}`;
            return { success: false, errors: [errorMessage] };
        }
    }
    async validateExternalServices() {
        const errors = [];
        if (!config_1.config.OPENAI_API_KEY) {
            errors.push('Missing required environment variable: OPENAI_API_KEY - GPT API key is required for AI analysis');
        }
        else if (config_1.config.OPENAI_API_KEY.length < 20) {
            errors.push('Invalid OPENAI_API_KEY: API key appears to be too short (minimum 20 characters)');
        }
        if (!config_1.config.WHISPER_API_KEY) {
            errors.push('Missing required environment variable: WHISPER_API_KEY - Whisper API key is required for audio transcription');
        }
        else if (config_1.config.WHISPER_API_KEY.length < 20) {
            errors.push('Invalid WHISPER_API_KEY: API key appears to be too short (minimum 20 characters)');
        }
        if (!config_1.config.AWS_ACCESS_KEY_ID) {
            errors.push('Missing required environment variable: AWS_ACCESS_KEY_ID - AWS credentials are required for S3 file storage');
        }
        if (!config_1.config.AWS_SECRET_ACCESS_KEY) {
            errors.push('Missing required environment variable: AWS_SECRET_ACCESS_KEY - AWS credentials are required for S3 file storage');
        }
        if (!config_1.config.AWS_S3_BUCKET) {
            errors.push('Missing required environment variable: AWS_S3_BUCKET - S3 bucket name is required for file storage');
        }
        if (!config_1.config.JWT_SECRET) {
            errors.push('Missing required environment variable: JWT_SECRET - JWT secret is required for authentication');
        }
        else if (config_1.config.JWT_SECRET.length < 32) {
            errors.push('Invalid JWT_SECRET: Secret should be at least 32 characters long for security');
        }
        if (errors.length > 0) {
            console.error('❌ Configuration validation failed - required environment variables are missing or invalid:');
            errors.forEach(error => console.error(`   ⚠️  ${error}`));
            console.error('\n💡 Please ensure all required environment variables are set in your .env file');
        }
        this.validationResults.externalServices = errors.length === 0;
        return { success: errors.length === 0, errors };
    }
    async initializeMonitoring() {
        try {
            await MonitoringService_1.monitoringService.collectSystemMetrics();
            await MonitoringService_1.monitoringService.performHealthChecks();
            this.validationResults.monitoring = true;
            return { success: true, errors: [] };
        }
        catch (error) {
            const errorMessage = `Monitoring initialization failed: ${error?.message || String(error) || 'Unknown error'}`;
            return { success: false, errors: [errorMessage] };
        }
    }
    validateSystemResources() {
        const errors = [];
        const warnings = [];
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
        if (heapUsedMB > 500) {
            warnings.push(`High initial memory usage: ${heapUsedMB.toFixed(1)}MB`);
        }
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 16) {
            errors.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
        }
        else if (majorVersion < 18) {
            warnings.push(`Node.js version ${nodeVersion} is outdated. Consider upgrading to Node.js 18+.`);
        }
        if (config_1.config.NODE_ENV === 'production') {
            if (!config_1.config.ADMIN_EMAILS && !config_1.config.ADMIN_DOMAINS) {
                warnings.push('No admin access configured for production environment');
            }
        }
        if (warnings.length > 0) {
            console.warn('⚠️  System resource warnings:');
            warnings.forEach(warning => console.warn(`   - ${warning}`));
        }
        this.validationResults.systemResources = errors.length === 0;
        return { success: errors.length === 0, errors };
    }
    getValidationResults() {
        return { ...this.validationResults };
    }
    isFullyValidated() {
        return Object.values(this.validationResults).every(result => result === true);
    }
    getStartupSummary() {
        return {
            timestamp: new Date().toISOString(),
            environment: config_1.config.NODE_ENV,
            nodeVersion: process.version,
            platform: process.platform,
            validations: this.validationResults,
            fullyValidated: this.isFullyValidated(),
            configuration: {
                port: config_1.config.PORT,
                database: config_1.config.DATABASE_URL ? 'configured' : 'not_configured',
                openai: {
                    gpt: config_1.config.OPENAI_API_KEY ? 'configured' : 'not_configured',
                    whisper: config_1.config.WHISPER_API_KEY ? 'configured' : 'not_configured'
                },
                aws: {
                    s3: config_1.config.AWS_S3_BUCKET ? 'configured' : 'not_configured',
                    region: config_1.config.AWS_REGION,
                    credentials: (config_1.config.AWS_ACCESS_KEY_ID && config_1.config.AWS_SECRET_ACCESS_KEY) ? 'configured' : 'not_configured'
                },
                features: {
                    rateLimiting: config_1.config.ENABLE_RATE_LIMITING,
                    abuseDetection: config_1.config.ENABLE_ABUSE_DETECTION,
                    adminEndpoints: config_1.config.ENABLE_ADMIN_ENDPOINTS
                }
            }
        };
    }
}
exports.StartupValidator = StartupValidator;
async function runStartupValidation() {
    const validator = StartupValidator.getInstance();
    return await validator.runStartupValidation();
}
function getStartupValidator() {
    return StartupValidator.getInstance();
}
//# sourceMappingURL=startup.js.map