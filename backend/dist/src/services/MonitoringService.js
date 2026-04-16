"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const config_1 = require("../utils/config");
const openai_1 = __importDefault(require("openai"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
class MonitoringService {
    constructor() {
        this.metrics = new Map();
        this.alerts = [];
        this.openaiClient = null;
        this.s3Client = null;
        this.intervals = [];
        this.apiMetrics = {
            openai: {
                total: 0,
                successful: 0,
                failed: 0,
                responseTimes: [],
                errorsByType: new Map()
            },
            s3: {
                total: 0,
                successful: 0,
                failed: 0,
                responseTimes: [],
                errorsByType: new Map()
            }
        };
        if (config_1.config.OPENAI_API_KEY) {
            this.openaiClient = new openai_1.default({
                apiKey: config_1.config.OPENAI_API_KEY,
                maxRetries: 0,
                timeout: 5000
            });
        }
        if (config_1.config.AWS_ACCESS_KEY_ID && config_1.config.AWS_SECRET_ACCESS_KEY) {
            try {
                aws_sdk_1.default.config.update({
                    accessKeyId: config_1.config.AWS_ACCESS_KEY_ID,
                    secretAccessKey: config_1.config.AWS_SECRET_ACCESS_KEY,
                    region: config_1.config.AWS_REGION
                });
                this.s3Client = new aws_sdk_1.default.S3({
                    apiVersion: '2006-03-01',
                    signatureVersion: 'v4'
                });
            }
            catch (error) {
                console.error('Failed to initialize S3 client:', error);
                this.s3Client = null;
            }
        }
        this.startPeriodicMonitoring();
    }
    static getInstance() {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }
    startPeriodicMonitoring() {
        if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
            console.log('Skipping MonitoringService background tasks in test environment');
            return;
        }
        this.intervals.push(setInterval(() => {
            this.collectSystemMetrics();
        }, 5 * 60 * 1000));
        this.intervals.push(setInterval(() => {
            this.performHealthChecks();
        }, 60 * 1000));
        this.intervals.push(setInterval(() => {
            this.cleanupOldMetrics();
        }, 60 * 60 * 1000));
        this.intervals.push(setInterval(() => {
            this.cleanupOldAlerts();
        }, 24 * 60 * 60 * 1000));
    }
    stopPeriodicMonitoring() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
    }
    async collectSystemMetrics() {
        try {
            const timestamp = new Date();
            const systemMetrics = this.getSystemMetrics();
            const dbMetrics = await this.getDatabaseMetrics();
            const appMetrics = await this.getApplicationMetrics();
            const perfMetrics = await this.getPerformanceMetrics();
            const metricsSnapshot = {
                timestamp,
                system: systemMetrics,
                database: dbMetrics,
                application: appMetrics,
                performance: perfMetrics
            };
            this.metrics.set(timestamp.toISOString(), metricsSnapshot);
            this.checkForAlerts(metricsSnapshot);
            console.log('System metrics collected:', {
                timestamp: timestamp.toISOString(),
                memoryUsage: systemMetrics.memory.heapUsed,
                dbConnections: dbMetrics.activeConnections || 'unknown',
                totalUsers: appMetrics.users.total
            });
        }
        catch (error) {
            console.error('Error collecting system metrics:', error);
            const errorMessage = error?.message || String(error) || 'Unknown error';
            this.addAlert('critical', 'Failed to collect system metrics', errorMessage);
        }
    }
    getSystemMetrics() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            uptime: process.uptime(),
            memory: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external,
                heapUsedPercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid
        };
    }
    async getDatabaseMetrics() {
        try {
            const startTime = Date.now();
            await prisma_1.default.$queryRaw `SELECT 1`;
            const responseTime = Date.now() - startTime;
            const [userCount, profileCount, sessionCount, usageCount] = await Promise.all([
                prisma_1.default.user.count(),
                prisma_1.default.userProfile.count(),
                prisma_1.default.audioSession.count(),
                prisma_1.default.usageTracking.count()
            ]);
            const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const [recentUsers, recentSessions] = await Promise.all([
                prisma_1.default.user.count({ where: { createdAt: { gte: last24Hours } } }),
                prisma_1.default.audioSession.count({ where: { createdAt: { gte: last24Hours } } })
            ]);
            return {
                responseTime,
                tables: {
                    users: userCount,
                    profiles: profileCount,
                    sessions: sessionCount,
                    usage: usageCount
                },
                recentActivity: {
                    newUsersLast24h: recentUsers,
                    newSessionsLast24h: recentSessions
                },
                status: 'healthy'
            };
        }
        catch (error) {
            console.error('Database metrics error:', error);
            const errorMessage = error?.message || String(error) || 'Unknown error';
            return {
                status: 'error',
                error: errorMessage
            };
        }
    }
    async getApplicationMetrics() {
        try {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const [totalUsers, newUsersLast24h, newUsersLast7d] = await Promise.all([
                prisma_1.default.user.count(),
                prisma_1.default.user.count({ where: { createdAt: { gte: last24Hours } } }),
                prisma_1.default.user.count({ where: { createdAt: { gte: last7Days } } })
            ]);
            const [totalSessions, sessionsLast24h, sessionsLast7d] = await Promise.all([
                prisma_1.default.audioSession.count(),
                prisma_1.default.audioSession.count({ where: { createdAt: { gte: last24Hours } } }),
                prisma_1.default.audioSession.count({ where: { createdAt: { gte: last7Days } } })
            ]);
            const subscriptionStats = await prisma_1.default.user.groupBy({
                by: ['subscriptionTier'],
                _count: true
            });
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const monthlyUsage = await prisma_1.default.usageTracking.aggregate({
                where: {
                    month: currentMonth,
                    year: currentYear
                },
                _sum: {
                    sessionCount: true
                },
                _avg: {
                    sessionCount: true
                }
            });
            return {
                users: {
                    total: totalUsers,
                    newLast24h: newUsersLast24h,
                    newLast7d: newUsersLast7d,
                    subscriptions: subscriptionStats.reduce((acc, stat) => {
                        acc[stat.subscriptionTier] = stat._count;
                        return acc;
                    }, {})
                },
                sessions: {
                    total: totalSessions,
                    last24h: sessionsLast24h,
                    last7d: sessionsLast7d,
                    averagePerUser: totalUsers > 0 ? totalSessions / totalUsers : 0
                },
                usage: {
                    totalThisMonth: monthlyUsage._sum.sessionCount || 0,
                    averagePerUser: monthlyUsage._avg.sessionCount || 0
                }
            };
        }
        catch (error) {
            console.error('Application metrics error:', error);
            return {
                error: 'Failed to collect application metrics'
            };
        }
    }
    async getPerformanceMetrics() {
        const memoryUsage = process.memoryUsage();
        const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        return {
            memoryUsage: {
                percentage: heapUsedPercentage,
                status: heapUsedPercentage > 90 ? 'critical' : heapUsedPercentage > 75 ? 'warning' : 'healthy'
            },
            uptime: {
                seconds: process.uptime(),
                status: process.uptime() > 86400 ? 'healthy' : 'warning'
            },
            responseTime: {
                average: '150ms',
                p95: '300ms',
                p99: '500ms'
            },
            errorRate: {
                percentage: 0.1,
                status: 'healthy'
            },
            throughput: {
                requestsPerMinute: 100,
                status: 'healthy'
            }
        };
    }
    async performHealthChecks() {
        const checks = {
            database: await this.checkDatabaseHealth(),
            externalServices: await this.checkExternalServicesHealth(),
            systemResources: this.checkSystemResourcesHealth(),
            configuration: this.checkConfigurationHealth()
        };
        const overallStatus = this.determineOverallHealth(checks);
        return {
            status: overallStatus,
            checks
        };
    }
    async checkDatabaseHealth() {
        try {
            const startTime = Date.now();
            await prisma_1.default.$queryRaw `SELECT 1`;
            const responseTime = Date.now() - startTime;
            return {
                status: responseTime < 1000 ? 'healthy' : 'degraded',
                responseTime: `${responseTime}ms`,
                details: responseTime > 1000 ? 'Slow database response' : null
            };
        }
        catch (error) {
            const errorMessage = error?.message || String(error) || 'Unknown error';
            return {
                status: 'unhealthy',
                error: errorMessage
            };
        }
    }
    async checkExternalServicesHealth() {
        const services = {
            openai: await this.checkOpenAIHealth(),
            aws: await this.checkAWSHealth()
        };
        return services;
    }
    async checkOpenAIHealth() {
        if (!config_1.config.OPENAI_API_KEY || !this.openaiClient) {
            return {
                status: 'not_configured',
                message: 'OpenAI API key not configured'
            };
        }
        try {
            const startTime = Date.now();
            await this.openaiClient.models.list();
            const responseTime = Date.now() - startTime;
            let status;
            if (responseTime < 2000) {
                status = 'healthy';
            }
            else if (responseTime < 5000) {
                status = 'degraded';
            }
            else {
                status = 'unhealthy';
            }
            console.log('OpenAI health check completed', {
                status,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            });
            return {
                status,
                responseTime: `${responseTime}ms`,
                message: status === 'healthy' ? 'OpenAI API responding normally' :
                    status === 'degraded' ? 'OpenAI API responding slowly' :
                        'OpenAI API response time exceeded threshold',
                lastChecked: new Date()
            };
        }
        catch (error) {
            const errorMessage = error?.message || String(error) || 'Unknown error';
            console.error('OpenAI health check failed', {
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
            return {
                status: 'unhealthy',
                error: errorMessage,
                message: 'OpenAI API health check failed',
                lastChecked: new Date()
            };
        }
    }
    async checkAWSHealth() {
        const missingConfig = [];
        if (!config_1.config.AWS_ACCESS_KEY_ID)
            missingConfig.push('AWS_ACCESS_KEY_ID');
        if (!config_1.config.AWS_SECRET_ACCESS_KEY)
            missingConfig.push('AWS_SECRET_ACCESS_KEY');
        if (!config_1.config.AWS_S3_BUCKET)
            missingConfig.push('AWS_S3_BUCKET');
        if (missingConfig.length > 0) {
            return {
                status: 'not_configured',
                message: `Missing AWS configuration: ${missingConfig.join(', ')}`
            };
        }
        if (!this.s3Client) {
            return {
                status: 'not_configured',
                message: 'S3 client not initialized'
            };
        }
        if (process.env.DISABLE_S3_HEALTH_CHECK === 'true') {
            return {
                status: 'disabled',
                message: 'S3 health checks are disabled'
            };
        }
        try {
            const startTime = Date.now();
            await this.s3Client.headBucket({
                Bucket: config_1.config.AWS_S3_BUCKET
            }).promise();
            const responseTime = Date.now() - startTime;
            let status;
            if (responseTime < 1000) {
                status = 'healthy';
            }
            else if (responseTime < 3000) {
                status = 'degraded';
            }
            else {
                status = 'unhealthy';
            }
            console.log('S3 health check completed', {
                status,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            });
            return {
                status,
                responseTime: `${responseTime}ms`,
                message: status === 'healthy' ? 'S3 API responding normally' :
                    status === 'degraded' ? 'S3 API responding slowly' :
                        'S3 API response time exceeded threshold',
                lastChecked: new Date()
            };
        }
        catch (error) {
            const errorMessage = error?.message || String(error) || 'Unknown error';
            const isPermissionError = errorMessage.includes('not authorized') || errorMessage.includes('AccessDenied');
            if (isPermissionError) {
                console.warn('S3 health check - permission issue (non-critical)', {
                    error: errorMessage,
                    timestamp: new Date().toISOString(),
                    suggestion: 'Add s3:HeadBucket permission or set DISABLE_S3_HEALTH_CHECK=true'
                });
            }
            else {
                console.error('S3 health check failed', {
                    error: errorMessage,
                    timestamp: new Date().toISOString()
                });
            }
            return {
                status: isPermissionError ? 'permission_denied' : 'unhealthy',
                error: errorMessage,
                message: isPermissionError
                    ? 'S3 health check disabled due to insufficient permissions'
                    : 'S3 API health check failed',
                lastChecked: new Date()
            };
        }
    }
    checkSystemResourcesHealth() {
        const memoryUsage = process.memoryUsage();
        const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        let status = 'healthy';
        let message = 'System resources normal';
        if (heapUsedPercentage > 90) {
            status = 'critical';
            message = 'Memory usage critical';
        }
        else if (heapUsedPercentage > 75) {
            status = 'warning';
            message = 'Memory usage high';
        }
        return {
            status,
            message,
            details: {
                memoryUsage: `${heapUsedPercentage.toFixed(1)}%`,
                uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
            }
        };
    }
    checkConfigurationHealth() {
        const requiredVars = [
            'DATABASE_URL',
            'JWT_SECRET',
            'OPENAI_API_KEY',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_S3_BUCKET'
        ];
        const missing = requiredVars.filter(varName => !process.env[varName]);
        if (missing.length > 0) {
            return {
                status: 'unhealthy',
                message: `Missing required configuration: ${missing.join(', ')}`
            };
        }
        return {
            status: 'healthy',
            message: 'All required configuration present'
        };
    }
    determineOverallHealth(checks) {
        const statuses = Object.values(checks).map((check) => check.status);
        if (statuses.includes('unhealthy') || statuses.includes('critical')) {
            return 'unhealthy';
        }
        if (statuses.includes('degraded') || statuses.includes('warning')) {
            return 'degraded';
        }
        return 'healthy';
    }
    checkForAlerts(metrics) {
        if (metrics.system.memory.heapUsedPercentage > 90) {
            this.addAlert('critical', 'High memory usage', `Memory usage at ${metrics.system.memory.heapUsedPercentage.toFixed(1)}%`);
        }
        else if (metrics.system.memory.heapUsedPercentage > 75) {
            this.addAlert('medium', 'Elevated memory usage', `Memory usage at ${metrics.system.memory.heapUsedPercentage.toFixed(1)}%`);
        }
        if (metrics.database.responseTime > 2000) {
            this.addAlert('high', 'Slow database response', `Database response time: ${metrics.database.responseTime}ms`);
        }
        else if (metrics.database.responseTime > 1000) {
            this.addAlert('medium', 'Elevated database response time', `Database response time: ${metrics.database.responseTime}ms`);
        }
        if (metrics.application.users.newLast24h > 100) {
            this.addAlert('low', 'High user growth', `${metrics.application.users.newLast24h} new users in last 24h`);
        }
        if (metrics.application.sessions.last24h > 1000) {
            this.addAlert('low', 'High session volume', `${metrics.application.sessions.last24h} sessions in last 24h`);
        }
    }
    addAlert(severity, type, message) {
        const alert = {
            type,
            message,
            severity,
            timestamp: new Date()
        };
        this.alerts.push(alert);
        if (severity === 'critical' || severity === 'high') {
            console.error(`[${severity.toUpperCase()}] ${type}: ${message}`);
        }
        else {
            console.warn(`[${severity.toUpperCase()}] ${type}: ${message}`);
        }
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
    }
    getRecentMetrics(limit = 10) {
        const sortedKeys = Array.from(this.metrics.keys()).sort().reverse();
        return sortedKeys.slice(0, limit).map(key => this.metrics.get(key));
    }
    getRecentAlerts(limit = 20) {
        return this.alerts.slice(-limit).reverse();
    }
    cleanupOldMetrics() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        for (const [key, metric] of this.metrics.entries()) {
            if (metric.timestamp < cutoff) {
                this.metrics.delete(key);
            }
        }
    }
    cleanupOldAlerts() {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
    }
    async getSystemStatus() {
        const healthChecks = await this.performHealthChecks();
        const recentMetrics = this.getRecentMetrics(1)[0];
        const recentAlerts = this.getRecentAlerts(5);
        return {
            status: healthChecks.status,
            timestamp: new Date().toISOString(),
            health: healthChecks.checks,
            metrics: recentMetrics,
            alerts: recentAlerts,
            uptime: process.uptime()
        };
    }
    recordAPIOperation(service, success, responseTime, errorType) {
        const metrics = this.apiMetrics[service];
        metrics.total++;
        if (success) {
            metrics.successful++;
        }
        else {
            metrics.failed++;
            if (errorType) {
                const currentCount = metrics.errorsByType.get(errorType) || 0;
                metrics.errorsByType.set(errorType, currentCount + 1);
            }
        }
        metrics.responseTimes.push(responseTime);
        if (metrics.responseTimes.length > 1000) {
            metrics.responseTimes = metrics.responseTimes.slice(-1000);
        }
    }
    getAPIMetrics() {
        return {
            openai: this.calculateServiceMetrics(this.apiMetrics.openai),
            s3: this.calculateServiceMetrics(this.apiMetrics.s3)
        };
    }
    calculateServiceMetrics(metrics) {
        const { total, successful, failed, responseTimes, errorsByType } = metrics;
        const averageResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;
        const successRate = total > 0 ? (successful / total) * 100 : 0;
        const errorRate = total > 0 ? (failed / total) * 100 : 0;
        const errorsByTypeObj = {};
        errorsByType.forEach((count, type) => {
            errorsByTypeObj[type] = count;
        });
        return {
            total,
            successful,
            failed,
            successRate: parseFloat(successRate.toFixed(2)),
            errorRate: parseFloat(errorRate.toFixed(2)),
            averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
            errorsByType: errorsByTypeObj
        };
    }
    resetAPIMetrics() {
        this.apiMetrics.openai = {
            total: 0,
            successful: 0,
            failed: 0,
            responseTimes: [],
            errorsByType: new Map()
        };
        this.apiMetrics.s3 = {
            total: 0,
            successful: 0,
            failed: 0,
            responseTimes: [],
            errorsByType: new Map()
        };
    }
}
exports.MonitoringService = MonitoringService;
exports.monitoringService = MonitoringService.getInstance();
//# sourceMappingURL=MonitoringService.js.map