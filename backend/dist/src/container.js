"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const client_1 = require("@prisma/client");
const config_1 = require("./utils/config");
const AuthService_1 = require("./services/AuthService");
const EmailService_1 = require("./services/EmailService");
const ProfileService_1 = require("./services/ProfileService");
const OnboardingService_1 = require("./services/OnboardingService");
const AudioSessionService_1 = require("./services/AudioSessionService");
const SubscriptionService_1 = require("./services/SubscriptionService");
const DashboardService_1 = require("./services/DashboardService");
const OpenAIService_1 = require("./services/OpenAIService");
const S3Service_1 = require("./services/S3Service");
const MonitoringService_1 = require("./services/MonitoringService");
const ErrorHandlingService_1 = require("./services/ErrorHandlingService");
class Container {
    constructor() {
        this.services = null;
    }
    static getInstance() {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
    async initialize() {
        if (this.services) {
            return this.services;
        }
        console.log('🔧 Initializing service container...');
        const prisma = new client_1.PrismaClient({
            log: config_1.config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
        try {
            await prisma.$connect();
            console.log('✅ Database connection established');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            throw new Error('Failed to connect to database');
        }
        const s3Config = {
            accessKeyId: config_1.config.AWS_ACCESS_KEY_ID,
            secretAccessKey: config_1.config.AWS_SECRET_ACCESS_KEY,
            region: config_1.config.AWS_REGION,
            bucketName: config_1.config.AWS_S3_BUCKET
        };
        const s3Service = (0, S3Service_1.createS3Service)(s3Config);
        console.log('✅ S3 service initialized');
        const openaiConfig = {
            gptApiKey: config_1.config.OPENAI_API_KEY,
            whisperApiKey: config_1.config.WHISPER_API_KEY,
            maxRetries: 3,
            timeout: 60000,
            gptModel: config_1.config.OPENAI_MODEL,
            ...(config_1.config.OPENAI_CONTEXT_LIMIT !== undefined
                ? { contextTokenLimit: config_1.config.OPENAI_CONTEXT_LIMIT }
                : {}),
            analysisTierSMaxInputTokens: config_1.config.ANALYSIS_TIER_S_MAX_INPUT_TOKENS,
            analysisPromptVersion: config_1.config.ANALYSIS_PROMPT_VERSION,
            enableLongTranscriptPipeline: config_1.config.ENABLE_LONG_TRANSCRIPT_PIPELINE
        };
        const openaiService = new OpenAIService_1.OpenAIService(openaiConfig);
        console.log('✅ OpenAI service initialized');
        const emailService = (0, EmailService_1.createEmailService)({
            resendApiKey: config_1.config.RESEND_API_KEY,
            fromAddress: config_1.config.EMAIL_FROM_ADDRESS || 'noreply@example.com',
            fromName: config_1.config.EMAIL_FROM_NAME || 'Your App'
        });
        const errorHandlingService = ErrorHandlingService_1.ErrorHandlingService.getInstance();
        console.log('✅ Error handling service initialized');
        const authService = new AuthService_1.AuthService(prisma, emailService, config_1.config.GOOGLE_CLIENT_ID);
        const subscriptionService = new SubscriptionService_1.SubscriptionService(prisma);
        const dashboardService = new DashboardService_1.DashboardService(prisma);
        const profileService = new ProfileService_1.ProfileService(s3Service, openaiService, prisma);
        const onboardingService = new OnboardingService_1.OnboardingService(profileService, openaiService, s3Service, prisma);
        const audioSessionService = new AudioSessionService_1.AudioSessionService(prisma, openaiService, s3Service, subscriptionService);
        console.log('✅ Core services initialized');
        this.services = {
            prisma,
            authService,
            profileService,
            onboardingService,
            audioSessionService,
            subscriptionService,
            dashboardService,
            openaiService,
            s3Service,
            monitoringService: MonitoringService_1.monitoringService,
            errorHandlingService
        };
        console.log('🎉 Service container initialization complete');
        return this.services;
    }
    getServices() {
        if (!this.services) {
            throw new Error('Container not initialized. Call initialize() first.');
        }
        return this.services;
    }
    async cleanup() {
        if (this.services) {
            console.log('🧹 Cleaning up services...');
            await this.services.prisma.$disconnect();
            console.log('✅ Services cleaned up');
        }
    }
}
exports.container = Container.getInstance();
exports.default = exports.container;
//# sourceMappingURL=container.js.map