"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const container_1 = __importDefault(require("../../src/container"));
const index_1 = require("../../src/index");
const verifiedAuth_1 = require("./helpers/verifiedAuth");
const safePrismaCleanup_1 = require("./helpers/safePrismaCleanup");
describe('Comprehensive System Integration Tests', () => {
    let app;
    let services;
    let prisma;
    let testUsers = [];
    beforeAll(async () => {
        services = await container_1.default.initialize();
        prisma = services.prisma;
        app = await (0, index_1.createApp)();
        await cleanupTestData();
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
                            contains: 'comprehensive-test'
                        }
                    }
                }
            });
            await prisma.usageTracking.deleteMany({
                where: {
                    user: {
                        email: {
                            contains: 'comprehensive-test'
                        }
                    }
                }
            });
            await prisma.userProfile.deleteMany({
                where: {
                    user: {
                        email: {
                            contains: 'comprehensive-test'
                        }
                    }
                }
            });
            await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma, {
                email: { contains: 'comprehensive-test' }
            });
            await prisma.user.deleteMany({
                where: {
                    email: {
                        contains: 'comprehensive-test'
                    }
                }
            });
        }
        catch (error) {
        }
    }
    describe('1. Service Container and Dependency Injection', () => {
        it('should have all services properly wired in container', () => {
            expect(services.prisma).toBeDefined();
            expect(services.authService).toBeDefined();
            expect(services.profileService).toBeDefined();
            expect(services.audioSessionService).toBeDefined();
            expect(services.subscriptionService).toBeDefined();
            expect(services.dashboardService).toBeDefined();
            expect(services.openaiService).toBeDefined();
            expect(services.s3Service).toBeDefined();
            expect(services.monitoringService).toBeDefined();
            expect(services.errorHandlingService).toBeDefined();
        });
        it('should have database connection established', async () => {
            const result = await prisma.$queryRaw `SELECT 1 as test`;
            expect(result).toBeDefined();
        });
        it('should have proper service dependencies', () => {
            expect(services.audioSessionService).toBeDefined();
            expect(services.profileService).toBeDefined();
            expect(services.authService.constructor.name).toBe('AuthService');
            expect(services.profileService.constructor.name).toBe('ProfileService');
            expect(services.audioSessionService.constructor.name).toBe('AudioSessionService');
        });
    });
    describe('2. Comprehensive Input Validation', () => {
        describe('Authentication Validation', () => {
            it('should validate registration input comprehensively', async () => {
                const noEmailResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/register')
                    .send({ password: 'ValidPassword123!' });
                expect(noEmailResponse.status).toBe(400);
                expect(noEmailResponse.body.error.code).toBe('VALIDATION_ERROR');
                const invalidEmailResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/register')
                    .send({ email: 'not-an-email', password: 'ValidPassword123!' });
                expect(invalidEmailResponse.status).toBe(400);
                const noUppercaseResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/register')
                    .send({ email: 'test@example.com', password: 'validpassword123!' });
                expect(noUppercaseResponse.status).toBe(400);
                const noSpecialResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/register')
                    .send({ email: 'test@example.com', password: 'ValidPassword123' });
                expect(noSpecialResponse.status).toBe(400);
                const tooShortResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/register')
                    .send({ email: 'test@example.com', password: 'Val1!' });
                expect(tooShortResponse.status).toBe(400);
            });
            it('should validate login input', async () => {
                const noPasswordResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/login')
                    .send({ email: 'test@example.com' });
                expect(noPasswordResponse.status).toBe(400);
                const noEmailResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/login')
                    .send({ password: 'password' });
                expect(noEmailResponse.status).toBe(400);
                const invalidEmailResponse = await (0, supertest_1.default)(app)
                    .post('/api/auth/login')
                    .send({ email: 'not-an-email', password: 'password' });
                expect(invalidEmailResponse.status).toBe(400);
            });
        });
        describe('Profile Validation', () => {
            let authToken;
            beforeAll(async () => {
                const session = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'comprehensive-test-profile@example.com', 'ValidPassword123!');
                authToken = session.token;
            });
            it('should validate profile update input', async () => {
                const emptyUpdateResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({});
                expect(emptyUpdateResponse.status).toBe(400);
                const validUpdateResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ targetIndustry: 'Technology' });
                expect(validUpdateResponse.status).toBe(200);
            });
            it('should validate target role input', async () => {
                const missingJobTitleResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile/target-role')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ targetIndustry: 'Technology' });
                expect(missingJobTitleResponse.status).toBe(400);
                const missingIndustryResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile/target-role')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ targetJobTitle: 'Software Engineer' });
                expect(missingIndustryResponse.status).toBe(400);
                const validResponse = await (0, supertest_1.default)(app)
                    .put('/api/profile/target-role')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Software Engineer'
                });
                expect(validResponse.status).toBe(200);
            });
        });
        describe('Session Validation', () => {
            let authToken;
            let sessionId;
            beforeAll(async () => {
                const session = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'comprehensive-test-session@example.com', 'ValidPassword123!');
                authToken = session.token;
                const sessionResponse = await (0, supertest_1.default)(app)
                    .post('/api/sessions/start')
                    .set('Authorization', `Bearer ${authToken}`);
                sessionId = sessionResponse.body.data.sessionId;
            });
            it('should validate session ID parameters', async () => {
                const invalidUuidResponse = await (0, supertest_1.default)(app)
                    .get('/api/sessions/invalid-uuid')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(invalidUuidResponse.status).toBe(400);
                expect(invalidUuidResponse.body.error.code).toBe('VALIDATION_ERROR');
                const validResponse = await (0, supertest_1.default)(app)
                    .get(`/api/sessions/${sessionId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                expect(validResponse.status).toBe(200);
            });
            it('should validate session history query parameters', async () => {
                const invalidLimitResponse = await (0, supertest_1.default)(app)
                    .get('/api/sessions/history?limit=1000')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(invalidLimitResponse.status).toBe(400);
                const invalidOffsetResponse = await (0, supertest_1.default)(app)
                    .get('/api/sessions/history?offset=-1')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(invalidOffsetResponse.status).toBe(400);
                const validResponse = await (0, supertest_1.default)(app)
                    .get('/api/sessions/history?limit=10&offset=0')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(validResponse.status).toBe(200);
            });
        });
        describe('Dashboard Validation', () => {
            let authToken;
            beforeAll(async () => {
                const session = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'comprehensive-test-dashboard@example.com', 'ValidPassword123!');
                authToken = session.token;
            });
            it('should validate dashboard query parameters', async () => {
                const invalidInsightsResponse = await (0, supertest_1.default)(app)
                    .get('/api/dashboard/insights?limit=100')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(invalidInsightsResponse.status).toBe(400);
                const invalidTrendsResponse = await (0, supertest_1.default)(app)
                    .get('/api/dashboard/trends?days=1000')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(invalidTrendsResponse.status).toBe(400);
                const validInsightsResponse = await (0, supertest_1.default)(app)
                    .get('/api/dashboard/insights?limit=10')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(validInsightsResponse.status).toBe(200);
                const validTrendsResponse = await (0, supertest_1.default)(app)
                    .get('/api/dashboard/trends?days=30')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(validTrendsResponse.status).toBe(200);
            });
        });
        describe('Subscription Validation', () => {
            let authToken;
            beforeAll(async () => {
                const session = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'comprehensive-test-subscription@example.com', 'ValidPassword123!');
                authToken = session.token;
            });
            it('should validate subscription upgrade input', async () => {
                const invalidTierResponse = await (0, supertest_1.default)(app)
                    .post('/api/subscription/upgrade')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ tier: 'INVALID_TIER' });
                expect(invalidTierResponse.status).toBe(400);
                const missingTierResponse = await (0, supertest_1.default)(app)
                    .post('/api/subscription/upgrade')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({});
                expect(missingTierResponse.status).toBe(400);
                const validResponse = await (0, supertest_1.default)(app)
                    .post('/api/subscription/upgrade')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ tier: 'PAID' });
                expect(validResponse.status).toBe(200);
            });
        });
    });
    describe('3. Complete Request/Response Flow Integration', () => {
        it('should handle complete user workflow with proper service integration', async () => {
            const registerResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'comprehensive-test-workflow@example.com',
                password: 'ValidPassword123!'
            });
            expect(registerResponse.status).toBe(201);
            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.data.user).toBeDefined();
            expect(registerResponse.body.data.token).toBeUndefined();
            const user = registerResponse.body.data.user;
            const { token } = await (0, verifiedAuth_1.verifyUserEmailInDbAndLogin)(app, 'comprehensive-test-workflow@example.com', 'ValidPassword123!');
            testUsers.push({ id: user.id, email: user.email, token });
            const profileResponse = await (0, supertest_1.default)(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${token}`);
            expect(profileResponse.status).toBe(200);
            const profileUpdateResponse = await (0, supertest_1.default)(app)
                .put('/api/profile/target-role')
                .set('Authorization', `Bearer ${token}`)
                .send({
                targetIndustry: 'Technology',
                targetJobTitle: 'Software Engineer'
            });
            expect(profileUpdateResponse.status).toBe(200);
            const sessionResponse = await (0, supertest_1.default)(app)
                .post('/api/sessions/start')
                .set('Authorization', `Bearer ${token}`);
            expect(sessionResponse.status).toBe(201);
            const sessionId = sessionResponse.body.data.sessionId;
            const historyResponse = await (0, supertest_1.default)(app)
                .get('/api/sessions/history')
                .set('Authorization', `Bearer ${token}`);
            expect(historyResponse.status).toBe(200);
            expect(historyResponse.body.data.sessions.length).toBeGreaterThan(0);
            const statsResponse = await (0, supertest_1.default)(app)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${token}`);
            expect(statsResponse.status).toBe(200);
            const subscriptionInfoResponse = await (0, supertest_1.default)(app)
                .get('/api/subscription/info')
                .set('Authorization', `Bearer ${token}`);
            expect(subscriptionInfoResponse.status).toBe(200);
            expect(subscriptionInfoResponse.body.data.tier).toBe('FREE');
        });
        it('should enforce authentication across all protected endpoints', async () => {
            const protectedEndpoints = [
                { method: 'get', path: '/api/profile' },
                { method: 'put', path: '/api/profile' },
                { method: 'post', path: '/api/sessions/start' },
                { method: 'get', path: '/api/sessions/history' },
                { method: 'get', path: '/api/dashboard/stats' },
                { method: 'get', path: '/api/subscription/info' }
            ];
            for (const endpoint of protectedEndpoints) {
                let response;
                if (endpoint.method === 'get') {
                    response = await (0, supertest_1.default)(app).get(endpoint.path);
                }
                else if (endpoint.method === 'post') {
                    response = await (0, supertest_1.default)(app).post(endpoint.path);
                }
                else if (endpoint.method === 'put') {
                    response = await (0, supertest_1.default)(app).put(endpoint.path);
                }
                else {
                    continue;
                }
                expect(response.status).toBe(401);
                expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
            }
        });
        it('should enforce data isolation between users', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'comprehensive-test-user1@example.com',
                password: 'ValidPassword123!'
            })
                .expect(201);
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'comprehensive-test-user2@example.com',
                password: 'ValidPassword123!'
            })
                .expect(201);
            const user1Session = await (0, verifiedAuth_1.verifyUserEmailInDbAndLogin)(app, 'comprehensive-test-user1@example.com', 'ValidPassword123!');
            const user2Session = await (0, verifiedAuth_1.verifyUserEmailInDbAndLogin)(app, 'comprehensive-test-user2@example.com', 'ValidPassword123!');
            const user1Token = user1Session.token;
            const user2Token = user2Session.token;
            testUsers.push({
                id: user1Session.userId,
                email: 'comprehensive-test-user1@example.com',
                token: user1Token
            }, {
                id: user2Session.userId,
                email: 'comprehensive-test-user2@example.com',
                token: user2Token
            });
            const user1SessionResponse = await (0, supertest_1.default)(app)
                .post('/api/sessions/start')
                .set('Authorization', `Bearer ${user1Token}`);
            expect(user1SessionResponse.status).toBe(201);
            const user2HistoryResponse = await (0, supertest_1.default)(app)
                .get('/api/sessions/history')
                .set('Authorization', `Bearer ${user2Token}`);
            expect(user2HistoryResponse.status).toBe(200);
            expect(user2HistoryResponse.body.data.sessions.length).toBe(0);
            const sessionId = user1SessionResponse.body.data.sessionId;
            const user2AccessResponse = await (0, supertest_1.default)(app)
                .get(`/api/sessions/${sessionId}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(user2AccessResponse.status).toBe(403);
        });
    });
    describe('4. Error Handling Integration', () => {
        let authToken;
        beforeAll(async () => {
            const session = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'comprehensive-test-errors@example.com', 'ValidPassword123!');
            authToken = session.token;
            testUsers.push({
                id: session.userId,
                email: 'comprehensive-test-errors@example.com',
                token: authToken
            });
        });
        it('should handle validation errors consistently', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'invalid-email',
                password: 'weak'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.path).toBeDefined();
        });
        it('should handle not found errors', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/sessions/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(404);
            expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
        });
        it('should handle unauthorized access', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/profile');
            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
        });
        it('should sanitize input data', async () => {
            const xssPayload = '<script>alert("xss")</script>';
            const response = await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                targetIndustry: `Technology${xssPayload}`,
                targetJobTitle: `Engineer${xssPayload}`
            });
            expect(response.status).toBe(200);
            expect(response.body.data.targetIndustry).not.toContain('<script>');
            expect(response.body.data.targetJobTitle).not.toContain('<script>');
        });
    });
    describe('5. System Health and Monitoring', () => {
        it('should provide health check endpoints', async () => {
            const apiHealthResponse = await (0, supertest_1.default)(app)
                .get('/api/health');
            expect(apiHealthResponse.status).toBe(200);
            expect(apiHealthResponse.body.success).toBe(true);
            const rootHealthResponse = await (0, supertest_1.default)(app)
                .get('/');
            expect(rootHealthResponse.status).toBe(200);
            expect(rootHealthResponse.body.success).toBe(true);
        });
        it('should include performance monitoring headers', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/health');
            expect(response.status).toBe(200);
            expect(response.headers['x-content-type-options']).toBeDefined();
            expect(response.headers['x-frame-options']).toBeDefined();
        });
    });
    describe('6. API Documentation and Discovery', () => {
        it('should provide comprehensive API documentation', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api');
            expect(response.status).toBe(200);
            expect(response.body.endpoints).toBeDefined();
            expect(response.body.endpoints.auth).toBeDefined();
            expect(response.body.endpoints.profile).toBeDefined();
            expect(response.body.endpoints.sessions).toBeDefined();
            expect(response.body.endpoints.subscription).toBeDefined();
            expect(response.body.endpoints.dashboard).toBeDefined();
        });
        it('should provide root endpoint with system information', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('AI Audio Summarization Backend API');
            expect(response.body.environment).toBeDefined();
            expect(response.body.startup).toBeDefined();
        });
    });
    describe('7. Subscription Limits Integration', () => {
        let freeUserToken;
        let paidUserToken;
        beforeAll(async () => {
            const freeSession = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'comprehensive-test-free@example.com', 'ValidPassword123!');
            freeUserToken = freeSession.token;
            testUsers.push({
                id: freeSession.userId,
                email: 'comprehensive-test-free@example.com',
                token: freeUserToken
            });
            const paidSession = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'comprehensive-test-paid@example.com', 'ValidPassword123!');
            paidUserToken = paidSession.token;
            testUsers.push({
                id: paidSession.userId,
                email: 'comprehensive-test-paid@example.com',
                token: paidUserToken
            });
            await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${paidUserToken}`)
                .send({ tier: 'PAID' });
        });
        it('should allow session starts while completed-session usage is under the free tier cap', async () => {
            for (let i = 0; i < 5; i++) {
                const response = await (0, supertest_1.default)(app)
                    .post('/api/sessions/start')
                    .set('Authorization', `Bearer ${freeUserToken}`);
                expect(response.status).toBe(201);
            }
        });
        it('should allow unlimited sessions for paid tier', async () => {
            for (let i = 0; i < 5; i++) {
                const response = await (0, supertest_1.default)(app)
                    .post('/api/sessions/start')
                    .set('Authorization', `Bearer ${paidUserToken}`);
                expect(response.status).toBe(201);
            }
        });
    });
});
//# sourceMappingURL=comprehensive-system-integration.test.js.map