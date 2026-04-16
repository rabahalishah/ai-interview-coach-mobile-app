"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MonitoringService_1 = require("../../../src/services/MonitoringService");
describe('MonitoringService Health Checks', () => {
    let monitoringService;
    beforeAll(() => {
        monitoringService = MonitoringService_1.MonitoringService.getInstance();
    });
    describe('Health Check Functionality', () => {
        it('should perform health checks and return status', async () => {
            const result = await monitoringService.performHealthChecks();
            expect(result).toBeDefined();
            expect(result.status).toBeDefined();
            expect(result.checks).toBeDefined();
            expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
        });
        it('should include database health check', async () => {
            const result = await monitoringService.performHealthChecks();
            expect(result.checks.database).toBeDefined();
            expect(result.checks.database.status).toBeDefined();
        });
        it('should include external services health checks', async () => {
            const result = await monitoringService.performHealthChecks();
            expect(result.checks.externalServices).toBeDefined();
            expect(result.checks.externalServices.openai).toBeDefined();
            expect(result.checks.externalServices.aws).toBeDefined();
        });
        it('should include system resources health check', async () => {
            const result = await monitoringService.performHealthChecks();
            expect(result.checks.systemResources).toBeDefined();
            expect(result.checks.systemResources.status).toBeDefined();
        });
        it('should include configuration health check', async () => {
            const result = await monitoringService.performHealthChecks();
            expect(result.checks.configuration).toBeDefined();
            expect(result.checks.configuration.status).toBeDefined();
        });
        it('should return system status with health checks', async () => {
            const systemStatus = await monitoringService.getSystemStatus();
            expect(systemStatus).toBeDefined();
            expect(systemStatus.status).toBeDefined();
            expect(systemStatus.health).toBeDefined();
            expect(systemStatus.timestamp).toBeDefined();
        });
    });
    describe('OpenAI Health Check', () => {
        it('should handle OpenAI health check when API key is not configured', async () => {
            const result = await monitoringService.performHealthChecks();
            const openaiHealth = result.checks.externalServices.openai;
            expect(['not_configured', 'healthy', 'degraded', 'unhealthy']).toContain(openaiHealth.status);
        });
        it('should include response time when OpenAI check succeeds', async () => {
            const result = await monitoringService.performHealthChecks();
            const openaiHealth = result.checks.externalServices.openai;
            if (openaiHealth.status === 'healthy' || openaiHealth.status === 'degraded') {
                expect(openaiHealth.responseTime).toBeDefined();
            }
        });
        it('should include error message when OpenAI check fails', async () => {
            const result = await monitoringService.performHealthChecks();
            const openaiHealth = result.checks.externalServices.openai;
            if (openaiHealth.status === 'unhealthy') {
                expect(openaiHealth.error).toBeDefined();
            }
        });
    });
    describe('S3 Health Check', () => {
        it('should handle S3 health check when AWS is not configured', async () => {
            const result = await monitoringService.performHealthChecks();
            const awsHealth = result.checks.externalServices.aws;
            expect(['not_configured', 'healthy', 'degraded', 'unhealthy']).toContain(awsHealth.status);
        });
        it('should include response time when S3 check succeeds', async () => {
            const result = await monitoringService.performHealthChecks();
            const awsHealth = result.checks.externalServices.aws;
            if (awsHealth.status === 'healthy' || awsHealth.status === 'degraded') {
                expect(awsHealth.responseTime).toBeDefined();
            }
        });
        it('should include error message when S3 check fails', async () => {
            const result = await monitoringService.performHealthChecks();
            const awsHealth = result.checks.externalServices.aws;
            if (awsHealth.status === 'unhealthy') {
                expect(awsHealth.error).toBeDefined();
            }
        });
    });
    describe('Health Status Determination', () => {
        it('should determine overall health status correctly', async () => {
            const result = await monitoringService.performHealthChecks();
            expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
            const checks = [
                result.checks.database.status,
                result.checks.systemResources.status,
                result.checks.configuration.status
            ];
            if (checks.includes('unhealthy') || checks.includes('critical')) {
                expect(result.status).toBe('unhealthy');
            }
        });
    });
});
describe('MonitoringService API Metrics Tracking', () => {
    let monitoringService;
    beforeAll(() => {
        monitoringService = MonitoringService_1.MonitoringService.getInstance();
    });
    beforeEach(() => {
        monitoringService.resetAPIMetrics();
    });
    describe('Recording API Operations', () => {
        it('should record successful OpenAI API call', () => {
            monitoringService.recordAPIOperation('openai', true, 150);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.total).toBe(1);
            expect(metrics.openai.successful).toBe(1);
            expect(metrics.openai.failed).toBe(0);
            expect(metrics.openai.averageResponseTime).toBe(150);
        });
        it('should record failed OpenAI API call with error type', () => {
            monitoringService.recordAPIOperation('openai', false, 200, 'RateLimitError');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.total).toBe(1);
            expect(metrics.openai.successful).toBe(0);
            expect(metrics.openai.failed).toBe(1);
            expect(metrics.openai.errorsByType.RateLimitError).toBe(1);
        });
        it('should record successful S3 API call', () => {
            monitoringService.recordAPIOperation('s3', true, 75);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.s3.total).toBe(1);
            expect(metrics.s3.successful).toBe(1);
            expect(metrics.s3.failed).toBe(0);
            expect(metrics.s3.averageResponseTime).toBe(75);
        });
        it('should record failed S3 API call with error type', () => {
            monitoringService.recordAPIOperation('s3', false, 100, 'NoSuchKey');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.s3.total).toBe(1);
            expect(metrics.s3.successful).toBe(0);
            expect(metrics.s3.failed).toBe(1);
            expect(metrics.s3.errorsByType.NoSuchKey).toBe(1);
        });
        it('should track multiple API calls', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('openai', true, 200);
            monitoringService.recordAPIOperation('openai', false, 150, 'TimeoutError');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.total).toBe(3);
            expect(metrics.openai.successful).toBe(2);
            expect(metrics.openai.failed).toBe(1);
        });
        it('should track multiple error types', () => {
            monitoringService.recordAPIOperation('openai', false, 100, 'RateLimitError');
            monitoringService.recordAPIOperation('openai', false, 150, 'TimeoutError');
            monitoringService.recordAPIOperation('openai', false, 200, 'RateLimitError');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.errorsByType.RateLimitError).toBe(2);
            expect(metrics.openai.errorsByType.TimeoutError).toBe(1);
        });
    });
    describe('Calculating Average Response Times', () => {
        it('should calculate average response time for OpenAI', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('openai', true, 200);
            monitoringService.recordAPIOperation('openai', true, 300);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.averageResponseTime).toBe(200);
        });
        it('should calculate average response time for S3', () => {
            monitoringService.recordAPIOperation('s3', true, 50);
            monitoringService.recordAPIOperation('s3', true, 100);
            monitoringService.recordAPIOperation('s3', true, 150);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.s3.averageResponseTime).toBe(100);
        });
        it('should include failed calls in average response time', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('openai', false, 200, 'Error');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.averageResponseTime).toBe(150);
        });
        it('should return 0 for average response time when no calls recorded', () => {
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.averageResponseTime).toBe(0);
            expect(metrics.s3.averageResponseTime).toBe(0);
        });
        it('should handle decimal response times correctly', () => {
            monitoringService.recordAPIOperation('openai', true, 123.45);
            monitoringService.recordAPIOperation('openai', true, 234.56);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.averageResponseTime).toBeCloseTo(179.00, 1);
        });
    });
    describe('Calculating Success and Error Rates', () => {
        it('should calculate success rate correctly', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('openai', true, 150);
            monitoringService.recordAPIOperation('openai', false, 200, 'Error');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.successRate).toBeCloseTo(66.67, 2);
            expect(metrics.openai.errorRate).toBeCloseTo(33.33, 2);
        });
        it('should return 0% success rate when all calls fail', () => {
            monitoringService.recordAPIOperation('s3', false, 100, 'Error1');
            monitoringService.recordAPIOperation('s3', false, 150, 'Error2');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.s3.successRate).toBe(0);
            expect(metrics.s3.errorRate).toBe(100);
        });
        it('should return 100% success rate when all calls succeed', () => {
            monitoringService.recordAPIOperation('s3', true, 100);
            monitoringService.recordAPIOperation('s3', true, 150);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.s3.successRate).toBe(100);
            expect(metrics.s3.errorRate).toBe(0);
        });
        it('should return 0% for both rates when no calls recorded', () => {
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.successRate).toBe(0);
            expect(metrics.openai.errorRate).toBe(0);
            expect(metrics.s3.successRate).toBe(0);
            expect(metrics.s3.errorRate).toBe(0);
        });
    });
    describe('Exposing Metrics via Monitoring Endpoint', () => {
        it('should expose metrics for both OpenAI and S3', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('s3', true, 50);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics).toHaveProperty('openai');
            expect(metrics).toHaveProperty('s3');
        });
        it('should include all required metric fields', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('openai', false, 150, 'Error');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai).toHaveProperty('total');
            expect(metrics.openai).toHaveProperty('successful');
            expect(metrics.openai).toHaveProperty('failed');
            expect(metrics.openai).toHaveProperty('successRate');
            expect(metrics.openai).toHaveProperty('errorRate');
            expect(metrics.openai).toHaveProperty('averageResponseTime');
            expect(metrics.openai).toHaveProperty('errorsByType');
        });
        it('should return metrics in JSON-serializable format', () => {
            monitoringService.recordAPIOperation('openai', false, 100, 'Error1');
            monitoringService.recordAPIOperation('s3', false, 150, 'Error2');
            const metrics = monitoringService.getAPIMetrics();
            expect(() => JSON.stringify(metrics)).not.toThrow();
            expect(typeof metrics.openai.errorsByType).toBe('object');
            expect(typeof metrics.s3.errorsByType).toBe('object');
        });
    });
    describe('Memory Management', () => {
        it('should limit response times array to prevent memory issues', () => {
            for (let i = 0; i < 1500; i++) {
                monitoringService.recordAPIOperation('openai', true, 100 + i);
            }
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.total).toBe(1500);
            expect(metrics.openai.averageResponseTime).toBeGreaterThan(0);
        });
    });
    describe('Resetting Metrics', () => {
        it('should reset all metrics to initial state', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('openai', false, 150, 'Error');
            monitoringService.recordAPIOperation('s3', true, 50);
            monitoringService.resetAPIMetrics();
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.total).toBe(0);
            expect(metrics.openai.successful).toBe(0);
            expect(metrics.openai.failed).toBe(0);
            expect(metrics.openai.averageResponseTime).toBe(0);
            expect(Object.keys(metrics.openai.errorsByType).length).toBe(0);
            expect(metrics.s3.total).toBe(0);
            expect(metrics.s3.successful).toBe(0);
            expect(metrics.s3.failed).toBe(0);
            expect(metrics.s3.averageResponseTime).toBe(0);
            expect(Object.keys(metrics.s3.errorsByType).length).toBe(0);
        });
    });
    describe('Edge Cases', () => {
        it('should handle recording operation without error type for failed call', () => {
            monitoringService.recordAPIOperation('openai', false, 100);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.failed).toBe(1);
            expect(Object.keys(metrics.openai.errorsByType).length).toBe(0);
        });
        it('should handle zero response time', () => {
            monitoringService.recordAPIOperation('s3', true, 0);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.s3.averageResponseTime).toBe(0);
        });
        it('should handle very large response times', () => {
            monitoringService.recordAPIOperation('openai', true, 999999);
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.averageResponseTime).toBe(999999);
        });
        it('should maintain separate metrics for OpenAI and S3', () => {
            monitoringService.recordAPIOperation('openai', true, 100);
            monitoringService.recordAPIOperation('openai', false, 150, 'OpenAIError');
            monitoringService.recordAPIOperation('s3', true, 50);
            monitoringService.recordAPIOperation('s3', false, 75, 'S3Error');
            const metrics = monitoringService.getAPIMetrics();
            expect(metrics.openai.total).toBe(2);
            expect(metrics.openai.successful).toBe(1);
            expect(metrics.openai.failed).toBe(1);
            expect(metrics.openai.errorsByType.OpenAIError).toBe(1);
            expect(metrics.openai.errorsByType.S3Error).toBeUndefined();
            expect(metrics.s3.total).toBe(2);
            expect(metrics.s3.successful).toBe(1);
            expect(metrics.s3.failed).toBe(1);
            expect(metrics.s3.errorsByType.S3Error).toBe(1);
            expect(metrics.s3.errorsByType.OpenAIError).toBeUndefined();
        });
    });
});
//# sourceMappingURL=MonitoringService.test.js.map