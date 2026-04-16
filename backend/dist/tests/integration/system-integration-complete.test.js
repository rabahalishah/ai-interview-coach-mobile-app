"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const container_1 = __importDefault(require("../../src/container"));
const index_1 = require("../../src/index");
const systemIntegration_1 = require("../../src/utils/systemIntegration");
const verifiedAuth_1 = require("./helpers/verifiedAuth");
const safePrismaCleanup_1 = require("./helpers/safePrismaCleanup");
describe('Complete System Integration Tests - Task 13.1', () => {
    let app;
    let services;
    let prisma;
    let systemValidator;
    let testUsers = [];
    beforeAll(async () => {
        services = await container_1.default.initialize();
        prisma = services.prisma;
        systemValidator = (0, systemIntegration_1.createSystemIntegrationValidator)(services);
        app = await (0, index_1.createApp)();
        await cleanupTestData();
        await createTestUsers();
    });
    afterAll(async () => {
        await cleanupTestData();
        await container_1.default.cleanup();
    });
    async function cleanupTestData() {
        try {
            await prisma.audioSession.deleteMany({
                where: {
                    user: {
                        email: {
                            contains: 'system-integration-test'
                        }
                    }
                }
            });
            await prisma.usageTracking.deleteMany({
                where: {
                    user: {
                        email: {
                            contains: 'system-integration-test'
                        }
                    }
                }
            });
            await prisma.userProfile.deleteMany({
                where: {
                    user: {
                        email: {
                            contains: 'system-integration-test'
                        }
                    }
                }
            });
            await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma, {
                email: { contains: 'system-integration-test' }
            });
            await prisma.user.deleteMany({
                where: {
                    email: {
                        contains: 'system-integration-test'
                    }
                }
            });
        }
        catch (error) {
        }
    }
    async function createTestUsers() {
        await (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({
            email: 'system-integration-test-user@example.com',
            password: 'ValidPassword123!'
        })
            .expect(201);
        const regularSession = await (0, verifiedAuth_1.verifyUserEmailInDbAndLogin)(app, 'system-integration-test-user@example.com', 'ValidPassword123!');
        testUsers.push({
            id: regularSession.userId,
            email: 'system-integration-test-user@example.com',
            token: regularSession.token
        });
        await (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({
            email: 'system-integration-test-admin@example.com',
            password: 'ValidPassword123!'
        })
            .expect(201);
        const adminSession = await (0, verifiedAuth_1.verifyUserEmailInDbAndLogin)(app, 'system-integration-test-admin@example.com', 'ValidPassword123!');
        testUsers.push({
            id: adminSession.userId,
            email: 'system-integration-test-admin@example.com',
            token: adminSession.token,
            isAdmin: true
        });
    }
    describe('1. Service Container and Dependency Injection Wiring', () => {
        it('should have all required services properly wired in container', async () => {
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
            for (const serviceName of requiredServices) {
                expect(services[serviceName]).toBeDefined();
                expect(services[serviceName]).not.toBeNull();
            }
        });
        it('should validate service dependencies through admin endpoint', async () => {
            const adminUser = testUsers.find(user => user.isAdmin);
            if (!adminUser) {
                console.warn('Admin user not available, skipping admin endpoint test');
                return;
            }
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/service-dependencies')
                .set('Authorization', `Bearer ${adminUser.token}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.dependencies).toBeDefined();
            expect(Object.keys(response.body.data.dependencies).length).toBeGreaterThan(0);
        });
        it('should have proper service instantiation with correct dependencies', () => {
            expect(services.authService).toBeDefined();
            expect(services.profileService).toBeDefined();
            expect(services.audioSessionService).toBeDefined();
            expect(services.authService.constructor.name).toBe('AuthService');
            expect(services.profileService.constructor.name).toBe('ProfileService');
            expect(services.audioSessionService.constructor.name).toBe('AudioSessionService');
            expect(services.subscriptionService.constructor.name).toBe('SubscriptionService');
            expect(services.dashboardService.constructor.name).toBe('DashboardService');
        });
        it('should perform comprehensive system integration health check', async () => {
            const integrationReport = await systemValidator.performHealthCheck();
            expect(integrationReport).toBeDefined();
            expect(integrationReport.overall).toBeDefined();
            expect(['healthy', 'degraded', 'unhealthy']).toContain(integrationReport.overall);
            expect(integrationReport.checks).toBeDefined();
            expect(Array.isArray(integrationReport.checks)).toBe(true);
            expect(integrationReport.dependencies).toBeDefined();
            expect(integrationReport.dependencies.database).toBeDefined();
            expect(integrationReport.dependencies.serviceContainer).toBeDefined();
        });
    });
    describe('2. Complete Request/Response Flow Implementation', () => {
        it('should handle complete authentication flow with proper service integration', async () => {
            const registerResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'system-integration-flow-test@example.com',
                password: 'ValidPassword123!'
            });
            expect(registerResponse.status).toBe(201);
            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.data.user).toBeDefined();
            expect(registerResponse.body.data.token).toBeUndefined();
            const user = registerResponse.body.data.user;
            const { token } = await (0, verifiedAuth_1.verifyUserEmailInDbAndLogin)(app, 'system-integration-flow-test@example.com', 'ValidPassword123!');
            const loginResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'system-integration-flow-test@example.com',
                password: 'ValidPassword123!'
            });
            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.data.user.id).toBe(user.id);
            const profileResponse = await (0, supertest_1.default)(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${token}`);
            expect(profileResponse.status).toBe(200);
            expect(profileResponse.body.data.userId).toBe(user.id);
            const logoutResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            expect(logoutResponse.status).toBe(200);
            const afterLogoutProfile = await (0, supertest_1.default)(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${token}`);
            expect(afterLogoutProfile.status).toBe(200);
            await prisma.audioSession.deleteMany({ where: { userId: user.id } });
            await prisma.usageTracking.deleteMany({ where: { userId: user.id } });
            await prisma.userProfile.delete({ where: { userId: user.id } }).catch(() => { });
            await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma, {
                email: 'system-integration-flow-test@example.com'
            });
            await prisma.user.delete({ where: { id: user.id } }).catch(() => { });
        });
        it('should handle complete user workflow with service integration', async () => {
            const user = testUsers[0];
            const profileUpdateResponse = await (0, supertest_1.default)(app)
                .put('/api/profile/target-role')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                targetIndustry: 'Technology',
                targetJobTitle: 'Software Engineer'
            });
            expect(profileUpdateResponse.status).toBe(200);
            const sessionResponse = await (0, supertest_1.default)(app)
                .post('/api/sessions/start')
                .set('Authorization', `Bearer ${user.token}`);
            expect(sessionResponse.status).toBe(201);
            const sessionId = sessionResponse.body.data.sessionId;
            const historyResponse = await (0, supertest_1.default)(app)
                .get('/api/sessions/history')
                .set('Authorization', `Bearer ${user.token}`);
            expect(historyResponse.status).toBe(200);
            expect(historyResponse.body.data.sessions.length).toBeGreaterThan(0);
            const statsResponse = await (0, supertest_1.default)(app)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${user.token}`);
            expect(statsResponse.status).toBe(200);
            const subscriptionResponse = await (0, supertest_1.default)(app)
                .get('/api/subscription/info')
                .set('Authorization', `Bearer ${user.token}`);
            expect(subscriptionResponse.status).toBe(200);
        });
        it('should test request/response flow through admin endpoint', async () => {
            const adminUser = testUsers.find(user => user.isAdmin);
            if (!adminUser) {
                console.warn('Admin user not available, skipping admin flow test');
                return;
            }
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/test-request-flow')
                .set('Authorization', `Bearer ${adminUser.token}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.overallSuccess).toBe(true);
            expect(response.body.data.steps).toBeDefined();
            expect(Array.isArray(response.body.data.steps)).toBe(true);
            expect(response.body.data.successfulSteps).toBeGreaterThan(0);
        });
    });
    describe('3. Comprehensive Input Validation Across All Endpoints', () => {
        const user = () => testUsers[0];
        describe('Authentication Endpoint Validation', () => {
            it('should comprehensively validate registration input', async () => {
                const testCases = [
                    {
                        input: { password: 'ValidPassword123!' },
                        expectedError: 'VALIDATION_ERROR',
                        description: 'missing email'
                    },
                    {
                        input: { email: 'not-an-email', password: 'ValidPassword123!' },
                        expectedError: 'VALIDATION_ERROR',
                        description: 'invalid email format'
                    },
                    {
                        input: { email: 'test@example.com', password: 'weak' },
                        expectedError: 'VALIDATION_ERROR',
                        description: 'weak password'
                    },
                    {
                        input: { email: 'test@example.com', password: 'NoSpecialChars123' },
                        expectedError: 'VALIDATION_ERROR',
                        description: 'password without special characters'
                    },
                    {
                        input: { email: 'test@example.com', password: 'nouppercase123!' },
                        expectedError: 'VALIDATION_ERROR',
                        description: 'password without uppercase'
                    }
                ];
                for (const testCase of testCases) {
                    const response = await (0, supertest_1.default)(app)
                        .post('/api/auth/register')
                        .send(testCase.input);
                    expect(response.status).toBe(400);
                    expect(response.body.error.code).toBe(testCase.expectedError);
                }
            });
            it('should validate login input comprehensively', async () => {
                const testCases = [
                    {
                        input: { email: 'test@example.com' },
                        description: 'missing password'
                    },
                    {
                        input: { password: 'password' },
                        description: 'missing email'
                    },
                    {
                        input: { email: 'not-an-email', password: 'password' },
                        description: 'invalid email format'
                    }
                ];
                for (const testCase of testCases) {
                    const response = await (0, supertest_1.default)(app)
                        .post('/api/auth/login')
                        .send(testCase.input);
                    expect(response.status).toBe(400);
                    expect(response.body.error.code).toBe('VALIDATION_ERROR');
                }
            });
        });
        describe('Profile Endpoint Validation', () => {
            it('should validate profile update input comprehensively', async () => {
                const emptyResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${user().token}`)
                    .send({});
                expect(emptyResponse.status).toBe(400);
                const validResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${user().token}`)
                    .send({ targetIndustry: 'Technology' });
                expect(validResponse.status).toBe(200);
            });
            it('should validate target role input comprehensively', async () => {
                const testCases = [
                    {
                        input: { targetIndustry: 'Technology' },
                        description: 'missing job title'
                    },
                    {
                        input: { targetJobTitle: 'Software Engineer' },
                        description: 'missing industry'
                    },
                    {
                        input: {},
                        description: 'missing both fields'
                    }
                ];
                for (const testCase of testCases) {
                    const response = await (0, supertest_1.default)(app)
                        .put('/api/profile/target-role')
                        .set('Authorization', `Bearer ${user().token}`)
                        .send(testCase.input);
                    expect(response.status).toBe(400);
                }
                const validResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile/target-role')
                    .set('Authorization', `Bearer ${user().token}`)
                    .send({
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Software Engineer'
                });
                expect(validResponse.status).toBe(200);
            });
        });
        describe('Session Endpoint Validation', () => {
            let sessionId;
            beforeAll(async () => {
                const sessionResponse = await (0, supertest_1.default)(app)
                    .post('/api/sessions/start')
                    .set('Authorization', `Bearer ${user().token}`);
                sessionId = sessionResponse.body.data.sessionId;
            });
            it('should validate session ID parameters comprehensively', async () => {
                const invalidUuids = [
                    'invalid-uuid',
                    '123',
                    'not-a-uuid-at-all',
                    '12345678-1234-1234-1234-12345678901',
                    '12345678-1234-1234-1234-123456789012'
                ];
                for (const invalidUuid of invalidUuids) {
                    const response = await (0, supertest_1.default)(app)
                        .get(`/api/sessions/${invalidUuid}`)
                        .set('Authorization', `Bearer ${user().token}`);
                    expect(response.status).toBe(400);
                    expect(response.body.error.code).toBe('VALIDATION_ERROR');
                }
                const validResponse = await (0, supertest_1.default)(app)
                    .get(`/api/sessions/${sessionId}`)
                    .set('Authorization', `Bearer ${user().token}`);
                expect(validResponse.status).toBe(200);
            });
            it('should validate session history query parameters', async () => {
                const testCases = [
                    { query: '?limit=1000', description: 'limit too high' },
                    { query: '?limit=0', description: 'limit too low' },
                    { query: '?offset=-1', description: 'negative offset' },
                    { query: '?limit=abc', description: 'non-numeric limit' },
                    { query: '?offset=xyz', description: 'non-numeric offset' }
                ];
                for (const testCase of testCases) {
                    const response = await (0, supertest_1.default)(app)
                        .get(`/api/sessions/history${testCase.query}`)
                        .set('Authorization', `Bearer ${user().token}`);
                    expect(response.status).toBe(400);
                }
                const validResponse = await (0, supertest_1.default)(app)
                    .get('/api/sessions/history?limit=10&offset=0')
                    .set('Authorization', `Bearer ${user().token}`);
                expect(validResponse.status).toBe(200);
            });
        });
        describe('Dashboard Endpoint Validation', () => {
            it('should validate dashboard query parameters comprehensively', async () => {
                const testCases = [
                    { endpoint: '/api/dashboard/insights', query: '?limit=100', description: 'insights limit too high' },
                    { endpoint: '/api/dashboard/insights', query: '?limit=0', description: 'insights limit too low' },
                    { endpoint: '/api/dashboard/trends', query: '?days=1000', description: 'trends days too high' },
                    { endpoint: '/api/dashboard/trends', query: '?days=0', description: 'trends days too low' }
                ];
                for (const testCase of testCases) {
                    const response = await (0, supertest_1.default)(app)
                        .get(`${testCase.endpoint}${testCase.query}`)
                        .set('Authorization', `Bearer ${user().token}`);
                    expect(response.status).toBe(400);
                }
                const validInsightsResponse = await (0, supertest_1.default)(app)
                    .get('/api/dashboard/insights?limit=10')
                    .set('Authorization', `Bearer ${user().token}`);
                expect(validInsightsResponse.status).toBe(200);
                const validTrendsResponse = await (0, supertest_1.default)(app)
                    .get('/api/dashboard/trends?days=30')
                    .set('Authorization', `Bearer ${user().token}`);
                expect(validTrendsResponse.status).toBe(200);
            });
        });
        describe('Subscription Endpoint Validation', () => {
            it('should validate subscription upgrade input comprehensively', async () => {
                const testCases = [
                    { input: { tier: 'INVALID_TIER' }, description: 'invalid tier' },
                    { input: {}, description: 'missing tier' },
                    { input: { tier: 123 }, description: 'numeric tier' },
                    { input: { tier: null }, description: 'null tier' }
                ];
                for (const testCase of testCases) {
                    const response = await (0, supertest_1.default)(app)
                        .post('/api/subscription/upgrade')
                        .set('Authorization', `Bearer ${user().token}`)
                        .send(testCase.input);
                    expect(response.status).toBe(400);
                }
                const validResponse = await (0, supertest_1.default)(app)
                    .post('/api/subscription/upgrade')
                    .set('Authorization', `Bearer ${user().token}`)
                    .send({ tier: 'PAID' });
                expect(validResponse.status).toBe(200);
            });
        });
        describe('Input Sanitization', () => {
            it('should sanitize XSS attempts across all endpoints', async () => {
                const xssPayload = '<script>alert("xss")</script>';
                const response = await (0, supertest_1.default)(app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${user().token}`)
                    .send({
                    targetIndustry: `Technology${xssPayload}`,
                    targetJobTitle: `Engineer${xssPayload}`
                });
                expect(response.status).toBe(200);
                expect(response.body.data.targetIndustry).not.toContain('<script>');
                expect(response.body.data.targetJobTitle).not.toContain('<script>');
            });
            it('should handle SQL injection attempts safely', async () => {
                const sqlPayload = "'; DROP TABLE users; --";
                const response = await (0, supertest_1.default)(app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${user().token}`)
                    .send({
                    targetIndustry: `Technology${sqlPayload}`
                });
                expect(response.status).toBe(200);
            });
        });
    });
    describe('4. Integration Tests for Complete Workflows', () => {
        it('should handle complete user onboarding workflow', async () => {
            const registerResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'workflow-integration-test@example.com',
                password: 'ValidPassword123!'
            });
            expect(registerResponse.status).toBe(201);
            const user = registerResponse.body.data.user;
            const { token } = await (0, verifiedAuth_1.verifyUserEmailInDbAndLogin)(app, 'workflow-integration-test@example.com', 'ValidPassword123!');
            try {
                const profileResponse = await (0, supertest_1.default)(app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${token}`);
                expect(profileResponse.status).toBe(200);
                const targetRoleResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile/target-role')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Software Engineer'
                });
                expect(targetRoleResponse.status).toBe(200);
                const sessionResponse = await (0, supertest_1.default)(app)
                    .post('/api/sessions/start')
                    .set('Authorization', `Bearer ${token}`);
                expect(sessionResponse.status).toBe(201);
                const dashboardResponse = await (0, supertest_1.default)(app)
                    .get('/api/dashboard/stats')
                    .set('Authorization', `Bearer ${token}`);
                expect(dashboardResponse.status).toBe(200);
                const subscriptionResponse = await (0, supertest_1.default)(app)
                    .get('/api/subscription/info')
                    .set('Authorization', `Bearer ${token}`);
                expect(subscriptionResponse.status).toBe(200);
                expect(subscriptionResponse.body.data.tier).toBe('FREE');
                expect(subscriptionResponse.body.data.currentUsage).toBe(1);
            }
            finally {
                await prisma.audioSession.deleteMany({ where: { userId: user.id } });
                await prisma.usageTracking.deleteMany({ where: { userId: user.id } });
                await prisma.userProfile.delete({ where: { userId: user.id } }).catch(() => { });
                await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma, {
                    email: 'workflow-integration-test@example.com'
                });
                await prisma.user.delete({ where: { id: user.id } }).catch(() => { });
            }
        });
        it('should handle subscription upgrade workflow', async () => {
            const user = testUsers[0];
            const initialResponse = await (0, supertest_1.default)(app)
                .get('/api/subscription/info')
                .set('Authorization', `Bearer ${user.token}`);
            expect(initialResponse.status).toBe(200);
            const upgradeResponse = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${user.token}`)
                .send({ tier: 'PAID' });
            expect(upgradeResponse.status).toBe(200);
            const verifyResponse = await (0, supertest_1.default)(app)
                .get('/api/subscription/info')
                .set('Authorization', `Bearer ${user.token}`);
            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.data.tier).toBe('PAID');
        });
        it('should handle error scenarios gracefully', async () => {
            const user = testUsers[0];
            const nonExistentResponse = await (0, supertest_1.default)(app)
                .get('/api/sessions/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${user.token}`);
            expect(nonExistentResponse.status).toBe(404);
            expect(nonExistentResponse.body.error.code).toBe('SESSION_NOT_FOUND');
            const unauthorizedResponse = await (0, supertest_1.default)(app)
                .get('/api/profile');
            expect(unauthorizedResponse.status).toBe(401);
            expect(unauthorizedResponse.body.error.code).toBe('AUTHENTICATION_REQUIRED');
        });
    });
    describe('5. System Integration Health Monitoring', () => {
        it('should provide comprehensive system integration status', async () => {
            const adminUser = testUsers.find(user => user.isAdmin);
            if (!adminUser) {
                console.warn('Admin user not available, skipping integration status test');
                return;
            }
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/system-integration')
                .set('Authorization', `Bearer ${adminUser.token}`);
            expect([200, 206, 503]).toContain(response.status);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.overall).toBeDefined();
            expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.overall);
            expect(response.body.data.checks).toBeDefined();
            expect(Array.isArray(response.body.data.checks)).toBe(true);
        });
        it('should monitor all critical system components', async () => {
            const integrationReport = await systemValidator.performHealthCheck();
            const requiredChecks = [
                'database',
                'serviceContainer',
                'openai',
                's3'
            ];
            const checkServices = integrationReport.checks.map((check) => check.service);
            for (const requiredCheck of requiredChecks) {
                expect(checkServices).toContain(requiredCheck);
            }
        });
    });
});
//# sourceMappingURL=system-integration-complete.test.js.map