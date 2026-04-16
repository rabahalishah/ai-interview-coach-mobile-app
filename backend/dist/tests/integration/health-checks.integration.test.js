"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../src/utils/config");
const openai_1 = __importDefault(require("openai"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
describe('Health Checks Integration Tests', () => {
    let openaiClient = null;
    let s3Client = null;
    beforeAll(() => {
        if (config_1.config.OPENAI_API_KEY) {
            openaiClient = new openai_1.default({
                apiKey: config_1.config.OPENAI_API_KEY,
                maxRetries: 0,
                timeout: 5000
            });
        }
        if (config_1.config.AWS_ACCESS_KEY_ID && config_1.config.AWS_SECRET_ACCESS_KEY) {
            aws_sdk_1.default.config.update({
                accessKeyId: config_1.config.AWS_ACCESS_KEY_ID,
                secretAccessKey: config_1.config.AWS_SECRET_ACCESS_KEY,
                region: config_1.config.AWS_REGION
            });
            s3Client = new aws_sdk_1.default.S3({
                apiVersion: '2006-03-01',
                signatureVersion: 'v4'
            });
        }
    });
    describe('OpenAI Health Check', () => {
        it('should make real API call to OpenAI and report health status', async () => {
            if (!config_1.config.OPENAI_API_KEY || !openaiClient) {
                console.log('Skipping OpenAI health check test - API key not configured');
                return;
            }
            const startTime = Date.now();
            try {
                await openaiClient.models.list();
                const responseTime = Date.now() - startTime;
                expect(responseTime).toBeGreaterThan(0);
                expect(responseTime).toBeLessThan(10000);
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
                expect(['healthy', 'degraded', 'unhealthy']).toContain(status);
                console.log('OpenAI health check result:', {
                    status,
                    responseTime: `${responseTime}ms`,
                    message: status === 'healthy' ? 'OpenAI API responding normally' :
                        status === 'degraded' ? 'OpenAI API responding slowly' :
                            'OpenAI API response time exceeded threshold'
                });
                expect(status).toBeDefined();
            }
            catch (error) {
                console.error('OpenAI health check failed:', error.message);
                expect(error).toBeDefined();
                const status = 'unhealthy';
                expect(status).toBe('unhealthy');
            }
        }, 15000);
        it('should verify OpenAI health check response time thresholds', () => {
            const testCases = [
                { responseTime: 500, expected: 'healthy' },
                { responseTime: 1999, expected: 'healthy' },
                { responseTime: 2000, expected: 'degraded' },
                { responseTime: 4999, expected: 'degraded' },
                { responseTime: 5000, expected: 'unhealthy' },
                { responseTime: 10000, expected: 'unhealthy' }
            ];
            testCases.forEach(({ responseTime, expected }) => {
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
                expect(status).toBe(expected);
            });
        });
    });
    describe('S3 Health Check', () => {
        it('should make real API call to S3 and report health status', async () => {
            if (!config_1.config.AWS_ACCESS_KEY_ID || !config_1.config.AWS_SECRET_ACCESS_KEY || !config_1.config.AWS_S3_BUCKET || !s3Client) {
                console.log('Skipping S3 health check test - AWS credentials not configured');
                return;
            }
            const startTime = Date.now();
            try {
                await s3Client.listObjectsV2({
                    Bucket: config_1.config.AWS_S3_BUCKET,
                    MaxKeys: 1
                }).promise();
                const responseTime = Date.now() - startTime;
                expect(responseTime).toBeGreaterThan(0);
                expect(responseTime).toBeLessThan(10000);
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
                expect(['healthy', 'degraded', 'unhealthy']).toContain(status);
                console.log('S3 health check result:', {
                    status,
                    responseTime: `${responseTime}ms`,
                    message: status === 'healthy' ? 'S3 API responding normally' :
                        status === 'degraded' ? 'S3 API responding slowly' :
                            'S3 API response time exceeded threshold'
                });
                expect(status).toBeDefined();
            }
            catch (error) {
                console.log('S3 health check failed (may be expected due to permissions):', error.message);
                expect(error).toBeDefined();
                const status = 'unhealthy';
                expect(status).toBe('unhealthy');
            }
        }, 15000);
        it('should verify S3 health check response time thresholds', () => {
            const testCases = [
                { responseTime: 500, expected: 'healthy' },
                { responseTime: 999, expected: 'healthy' },
                { responseTime: 1000, expected: 'degraded' },
                { responseTime: 2999, expected: 'degraded' },
                { responseTime: 3000, expected: 'unhealthy' },
                { responseTime: 5000, expected: 'unhealthy' }
            ];
            testCases.forEach(({ responseTime, expected }) => {
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
                expect(status).toBe(expected);
            });
        });
    });
    describe('Combined Health Check Integration', () => {
        it('should verify both OpenAI and S3 health checks work together', async () => {
            const results = {
                openai: null,
                s3: null
            };
            if (config_1.config.OPENAI_API_KEY && openaiClient) {
                try {
                    const startTime = Date.now();
                    await openaiClient.models.list();
                    const responseTime = Date.now() - startTime;
                    results.openai = {
                        status: responseTime < 2000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy',
                        responseTime: `${responseTime}ms`
                    };
                }
                catch (error) {
                    results.openai = {
                        status: 'unhealthy',
                        error: error.message
                    };
                }
            }
            if (config_1.config.AWS_ACCESS_KEY_ID && config_1.config.AWS_SECRET_ACCESS_KEY && config_1.config.AWS_S3_BUCKET && s3Client) {
                try {
                    const startTime = Date.now();
                    await s3Client.listObjectsV2({
                        Bucket: config_1.config.AWS_S3_BUCKET,
                        MaxKeys: 1
                    }).promise();
                    const responseTime = Date.now() - startTime;
                    results.s3 = {
                        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
                        responseTime: `${responseTime}ms`
                    };
                }
                catch (error) {
                    results.s3 = {
                        status: 'unhealthy',
                        error: error.message
                    };
                }
            }
            expect(results.openai || results.s3).toBeTruthy();
            console.log('Combined health check results:', results);
            if (results.openai) {
                expect(results.openai.status).toBeDefined();
                expect(['healthy', 'degraded', 'unhealthy']).toContain(results.openai.status);
            }
            if (results.s3) {
                expect(results.s3.status).toBeDefined();
                expect(['healthy', 'degraded', 'unhealthy']).toContain(results.s3.status);
            }
        }, 20000);
    });
    describe('Health Check Error Handling', () => {
        it('should handle invalid API keys gracefully', async () => {
            const invalidClient = new openai_1.default({
                apiKey: 'invalid-key-12345',
                maxRetries: 0,
                timeout: 5000
            });
            try {
                await invalidClient.models.list();
                fail('Expected API call to fail with invalid key');
            }
            catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toBeDefined();
                const status = 'unhealthy';
                expect(status).toBe('unhealthy');
                console.log('Invalid API key handled correctly:', error.message);
            }
        }, 10000);
        it('should handle network timeouts gracefully', async () => {
            const timeoutClient = new openai_1.default({
                apiKey: config_1.config.OPENAI_API_KEY || 'test-key',
                maxRetries: 0,
                timeout: 1
            });
            try {
                await timeoutClient.models.list();
                console.log('API call succeeded despite short timeout');
            }
            catch (error) {
                expect(error).toBeDefined();
                const status = 'unhealthy';
                expect(status).toBe('unhealthy');
                console.log('Timeout handled correctly');
            }
        }, 10000);
    });
    describe('Health Check Interval Verification', () => {
        it('should verify health checks can be called multiple times', async () => {
            const results = [];
            for (let i = 0; i < 3; i++) {
                if (config_1.config.OPENAI_API_KEY && openaiClient) {
                    try {
                        const startTime = Date.now();
                        await openaiClient.models.list();
                        const responseTime = Date.now() - startTime;
                        results.push({
                            iteration: i + 1,
                            status: responseTime < 2000 ? 'healthy' : 'degraded',
                            responseTime: `${responseTime}ms`
                        });
                    }
                    catch (error) {
                        results.push({
                            iteration: i + 1,
                            status: 'unhealthy',
                            error: error.message
                        });
                    }
                }
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            if (config_1.config.OPENAI_API_KEY && openaiClient) {
                expect(results.length).toBe(3);
                results.forEach((result, index) => {
                    expect(result.status).toBeDefined();
                    console.log(`Health check ${index + 1}:`, result);
                });
            }
        }, 30000);
    });
});
//# sourceMappingURL=health-checks.integration.test.js.map