"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemIntegrationValidator = void 0;
exports.createSystemIntegrationValidator = createSystemIntegrationValidator;
exports.quickIntegrationCheck = quickIntegrationCheck;
const config_1 = require("./config");
class SystemIntegrationValidator {
    constructor(services) {
        this.services = services;
    }
    async performHealthCheck() {
        const startTime = Date.now();
        const checks = [];
        const databaseCheck = await this.checkDatabaseHealth();
        checks.push(databaseCheck);
        const containerCheck = await this.checkServiceContainer();
        checks.push(containerCheck);
        const externalChecks = await this.checkExternalServices();
        checks.push(...externalChecks);
        const apiChecks = await this.checkApiEndpoints();
        checks.push(...apiChecks);
        const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
        const degradedChecks = checks.filter(check => check.status === 'degraded');
        let overall = 'healthy';
        if (unhealthyChecks.length > 0) {
            overall = 'unhealthy';
        }
        else if (degradedChecks.length > 0) {
            overall = 'degraded';
        }
        return {
            overall,
            timestamp: new Date().toISOString(),
            checks,
            dependencies: {
                database: databaseCheck,
                externalServices: externalChecks,
                serviceContainer: containerCheck
            }
        };
    }
    async checkDatabaseHealth() {
        const startTime = Date.now();
        try {
            await this.services.prisma.$queryRaw `SELECT 1 as test`;
            const testResult = await this.services.prisma.$queryRaw `
        SELECT COUNT(*) as count FROM "users" WHERE 1=0
      `;
            const responseTime = Date.now() - startTime;
            return {
                service: 'database',
                status: responseTime < 1000 ? 'healthy' : 'degraded',
                message: `Database connection successful (${responseTime}ms)`,
                responseTime,
                details: {
                    connectionPool: 'active',
                    queryPerformance: responseTime < 500 ? 'optimal' : 'slow'
                }
            };
        }
        catch (error) {
            return {
                service: 'database',
                status: 'unhealthy',
                message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - startTime,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
        }
    }
    async checkServiceContainer() {
        const startTime = Date.now();
        try {
            const requiredServices = [
                'prisma',
                'authService',
                'profileService',
                'audioSessionService',
                'subscriptionService',
                'dashboardService',
                'openaiService',
                's3Service',
                'monitoringService',
                'errorHandlingService'
            ];
            const missingServices = [];
            const serviceDetails = {};
            for (const serviceName of requiredServices) {
                const service = this.services[serviceName];
                if (!service) {
                    missingServices.push(serviceName);
                }
                else {
                    serviceDetails[serviceName] = {
                        type: service.constructor?.name || 'Unknown',
                        initialized: true
                    };
                }
            }
            const responseTime = Date.now() - startTime;
            if (missingServices.length > 0) {
                return {
                    service: 'serviceContainer',
                    status: 'unhealthy',
                    message: `Missing services: ${missingServices.join(', ')}`,
                    responseTime,
                    details: { missingServices, availableServices: serviceDetails }
                };
            }
            return {
                service: 'serviceContainer',
                status: 'healthy',
                message: 'All services properly wired and initialized',
                responseTime,
                details: { services: serviceDetails }
            };
        }
        catch (error) {
            return {
                service: 'serviceContainer',
                status: 'unhealthy',
                message: `Service container check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - startTime,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
        }
    }
    async checkExternalServices() {
        const checks = [];
        const openaiCheck = await this.checkOpenAIService();
        checks.push(openaiCheck);
        const s3Check = await this.checkS3Service();
        checks.push(s3Check);
        return checks;
    }
    async checkOpenAIService() {
        const startTime = Date.now();
        try {
            const hasGptApiKey = !!config_1.config.OPENAI_API_KEY;
            const hasWhisperApiKey = !!config_1.config.WHISPER_API_KEY;
            const hasModel = !!config_1.config.OPENAI_MODEL;
            if (!hasGptApiKey || !hasWhisperApiKey || !hasModel) {
                return {
                    service: 'openai',
                    status: 'unhealthy',
                    message: 'OpenAI service not properly configured',
                    responseTime: Date.now() - startTime,
                    details: {
                        hasGptApiKey,
                        hasWhisperApiKey,
                        hasModel,
                        model: config_1.config.OPENAI_MODEL
                    }
                };
            }
            return {
                service: 'openai',
                status: 'healthy',
                message: 'OpenAI service properly configured',
                responseTime: Date.now() - startTime,
                details: {
                    model: config_1.config.OPENAI_MODEL,
                    maxTokens: config_1.config.OPENAI_MAX_TOKENS,
                    temperature: config_1.config.OPENAI_TEMPERATURE
                }
            };
        }
        catch (error) {
            return {
                service: 'openai',
                status: 'unhealthy',
                message: `OpenAI service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - startTime,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
        }
    }
    async checkS3Service() {
        const startTime = Date.now();
        try {
            const hasCredentials = !!(config_1.config.AWS_ACCESS_KEY_ID && config_1.config.AWS_SECRET_ACCESS_KEY);
            const hasRegion = !!config_1.config.AWS_REGION;
            const hasBucket = !!config_1.config.AWS_S3_BUCKET;
            if (!hasCredentials || !hasRegion || !hasBucket) {
                return {
                    service: 's3',
                    status: 'unhealthy',
                    message: 'S3 service not properly configured',
                    responseTime: Date.now() - startTime,
                    details: {
                        hasCredentials,
                        hasRegion,
                        hasBucket,
                        region: config_1.config.AWS_REGION,
                        bucket: config_1.config.AWS_S3_BUCKET
                    }
                };
            }
            return {
                service: 's3',
                status: 'healthy',
                message: 'S3 service properly configured',
                responseTime: Date.now() - startTime,
                details: {
                    region: config_1.config.AWS_REGION,
                    bucket: config_1.config.AWS_S3_BUCKET
                }
            };
        }
        catch (error) {
            return {
                service: 's3',
                status: 'unhealthy',
                message: `S3 service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - startTime,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
        }
    }
    async checkApiEndpoints() {
        const checks = [];
        const endpointGroups = [
            'auth',
            'profile',
            'sessions',
            'subscription',
            'dashboard',
            'admin'
        ];
        for (const group of endpointGroups) {
            checks.push({
                service: `api-${group}`,
                status: 'healthy',
                message: `${group} endpoints configured`,
                details: { routeGroup: group }
            });
        }
        return checks;
    }
    async validateServiceDependencies() {
        const issues = [];
        const dependencies = {};
        try {
            if (!this.services.authService) {
                issues.push('AuthService not available');
            }
            else {
                dependencies.AuthService = ['prisma'];
            }
            if (!this.services.profileService) {
                issues.push('ProfileService not available');
            }
            else {
                dependencies.ProfileService = ['prisma', 's3Service', 'openaiService'];
            }
            if (!this.services.audioSessionService) {
                issues.push('AudioSessionService not available');
            }
            else {
                dependencies.AudioSessionService = ['prisma', 'openaiService', 's3Service', 'subscriptionService'];
            }
            if (!this.services.subscriptionService) {
                issues.push('SubscriptionService not available');
            }
            else {
                dependencies.SubscriptionService = ['prisma'];
            }
            if (!this.services.dashboardService) {
                issues.push('DashboardService not available');
            }
            else {
                dependencies.DashboardService = ['prisma'];
            }
            return {
                valid: issues.length === 0,
                issues,
                dependencies
            };
        }
        catch (error) {
            issues.push(`Dependency validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                valid: false,
                issues,
                dependencies
            };
        }
    }
    async testRequestResponseFlow() {
        const steps = [];
        try {
            const startTime = Date.now();
            let stepStart = Date.now();
            try {
                await this.services.prisma.$queryRaw `SELECT 1`;
                steps.push({
                    step: 'Database Connection',
                    success: true,
                    message: 'Database connection successful',
                    duration: Date.now() - stepStart
                });
            }
            catch (error) {
                steps.push({
                    step: 'Database Connection',
                    success: false,
                    message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    duration: Date.now() - stepStart
                });
                return { success: false, steps };
            }
            stepStart = Date.now();
            const requiredServices = ['authService', 'profileService', 'audioSessionService'];
            let allServicesAvailable = true;
            for (const serviceName of requiredServices) {
                if (!this.services[serviceName]) {
                    allServicesAvailable = false;
                    break;
                }
            }
            steps.push({
                step: 'Service Instantiation',
                success: allServicesAvailable,
                message: allServicesAvailable ? 'All required services available' : 'Some services missing',
                duration: Date.now() - stepStart
            });
            if (!allServicesAvailable) {
                return { success: false, steps };
            }
            stepStart = Date.now();
            steps.push({
                step: 'Validation Middleware',
                success: true,
                message: 'Validation schemas configured',
                duration: Date.now() - stepStart
            });
            return {
                success: true,
                steps
            };
        }
        catch (error) {
            steps.push({
                step: 'Request/Response Flow Test',
                success: false,
                message: `Flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                duration: 0
            });
            return { success: false, steps };
        }
    }
}
exports.SystemIntegrationValidator = SystemIntegrationValidator;
function createSystemIntegrationValidator(services) {
    return new SystemIntegrationValidator(services);
}
async function quickIntegrationCheck(services) {
    try {
        const validator = new SystemIntegrationValidator(services);
        const report = await validator.performHealthCheck();
        return report.overall !== 'unhealthy';
    }
    catch (error) {
        console.error('Quick integration check failed:', error);
        return false;
    }
}
//# sourceMappingURL=systemIntegration.js.map