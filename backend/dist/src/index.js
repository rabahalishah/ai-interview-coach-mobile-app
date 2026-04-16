"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./utils/config");
const startup_1 = require("./utils/startup");
const systemIntegration_1 = require("./utils/systemIntegration");
const container_1 = __importDefault(require("./container"));
const analysisWorker_1 = require("./workers/analysisWorker");
const routes_1 = require("./routes");
const error_1 = require("./middleware/error");
const logging_1 = require("./middleware/logging");
const rateLimiting_1 = require("./middleware/rateLimiting");
const security_1 = require("./middleware/security");
dotenv_1.default.config();
async function createApp() {
    console.log('Recruit Me AI Backend starting...');
    const validation = await (0, startup_1.runStartupValidation)();
    if (!validation.success) {
        console.error('❌ Startup validation failed. Exiting...');
        process.exit(1);
    }
    const services = await container_1.default.initialize();
    console.log('🔍 Performing system integration check...');
    const integrationHealthy = await (0, systemIntegration_1.quickIntegrationCheck)(services);
    if (!integrationHealthy) {
        console.warn('⚠️  System integration check detected issues - proceeding with caution');
    }
    else {
        console.log('✅ System integration check passed');
    }
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false
    }));
    app.use(security_1.contentSecurityPolicy);
    app.use(logging_1.securityHeaders);
    app.use((0, cors_1.default)({
        origin: config_1.config.CORS_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
    }));
    if (config_1.config.ENABLE_REQUEST_LOGGING) {
        app.use((0, morgan_1.default)('combined'));
        app.use(logging_1.requestLogger);
    }
    if (config_1.config.ENABLE_PERFORMANCE_MONITORING) {
        app.use(logging_1.performanceMonitor);
    }
    app.use((0, logging_1.requestTimeout)(30000));
    app.use(security_1.validateRequest);
    app.use(logging_1.sanitizeRequest);
    app.use(security_1.validateApiKey);
    if (config_1.config.ENABLE_RATE_LIMITING) {
        app.use('/api', rateLimiting_1.apiRateLimit);
    }
    app.use(express_1.default.json({
        limit: `${Math.floor(config_1.config.MAX_FILE_SIZE / (1024 * 1024))}mb`
    }));
    app.use(express_1.default.urlencoded({
        extended: true,
        limit: `${Math.floor(config_1.config.MAX_FILE_SIZE / (1024 * 1024))}mb`
    }));
    if (config_1.config.ENABLE_ABUSE_DETECTION) {
        app.use(rateLimiting_1.abuseDetection);
    }
    app.use(security_1.sessionSecurity);
    app.use(logging_1.healthCheck);
    const apiRoutes = (0, routes_1.createApiRoutes)(services);
    app.use('/api', apiRoutes);
    app.get('/', (req, res) => {
        const startupSummary = (0, startup_1.getStartupValidator)().getStartupSummary();
        res.status(200).json({
            success: true,
            message: 'AI Audio Summarization Backend API',
            version: process.env.npm_package_version || '1.0.0',
            environment: config_1.config.NODE_ENV,
            timestamp: new Date().toISOString(),
            startup: startupSummary,
            documentation: '/api'
        });
    });
    app.use(error_1.notFoundHandler);
    app.use(error_1.errorHandler);
    return app;
}
let analysisWorker = null;
async function startServer() {
    const app = await createApp();
    const PORT = config_1.config.PORT;
    const gracefulShutdown = async () => {
        console.log('Shutting down gracefully...');
        await analysisWorker?.close();
        analysisWorker = null;
        await container_1.default.cleanup();
        process.exit(0);
    };
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        if (config_1.config.NODE_ENV === 'production') {
            process.exit(1);
        }
    });
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    });
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${config_1.config.NODE_ENV}`);
        console.log(`📊 Monitoring: Active`);
        console.log(`🔒 Security: Enhanced`);
        if (config_1.config.ENABLE_ADMIN_ENDPOINTS) {
            console.log(`👑 Admin endpoints: Enabled`);
        }
        console.log('🎉 Server startup complete!');
        try {
            analysisWorker = (0, analysisWorker_1.startAnalysisWorker)(container_1.default.getServices());
        }
        catch (e) {
            console.error('Failed to start analysis worker:', e);
        }
    });
    return app;
}
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
    startServer().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}
exports.default = startServer;
//# sourceMappingURL=index.js.map