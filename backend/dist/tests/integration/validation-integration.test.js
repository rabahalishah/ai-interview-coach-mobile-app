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
describe('Validation Integration Tests', () => {
    let app;
    let services;
    let prisma;
    let authToken;
    beforeAll(async () => {
        services = await container_1.default.initialize();
        prisma = services.prisma;
        app = await (0, index_1.createApp)();
        const { token } = await (0, verifiedAuth_1.getVerifiedAuthToken)(app, 'validation-test@example.com', 'ValidPassword123!');
        authToken = token;
    });
    afterAll(async () => {
        await prisma.audioSession.deleteMany({
            where: {
                user: {
                    email: 'validation-test@example.com'
                }
            }
        });
        await prisma.usageTracking.deleteMany({
            where: {
                user: {
                    email: 'validation-test@example.com'
                }
            }
        });
        await prisma.userProfile.deleteMany({
            where: {
                user: {
                    email: 'validation-test@example.com'
                }
            }
        });
        await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma, {
            email: 'validation-test@example.com'
        });
        await prisma.user.deleteMany({
            where: {
                email: 'validation-test@example.com'
            }
        });
        await container_1.default.cleanup();
    });
    describe('Authentication Endpoint Validation', () => {
        it('should validate registration input', async () => {
            const noEmailResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                password: 'ValidPassword123!'
            });
            expect(noEmailResponse.status).toBe(400);
            expect(noEmailResponse.body.error.code).toBe('VALIDATION_ERROR');
            const invalidEmailResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'not-an-email',
                password: 'ValidPassword123!'
            });
            expect(invalidEmailResponse.status).toBe(400);
            const weakPasswordResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'weak'
            });
            expect(weakPasswordResponse.status).toBe(400);
            const noSpecialCharsResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'Password123'
            });
            expect(noSpecialCharsResponse.status).toBe(400);
        });
        it('should validate login input', async () => {
            const noPasswordResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com'
            });
            expect(noPasswordResponse.status).toBe(400);
            expect(noPasswordResponse.body.error.code).toBe('VALIDATION_ERROR');
            const invalidEmailResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'not-an-email',
                password: 'password'
            });
            expect(invalidEmailResponse.status).toBe(400);
        });
        it('should validate refresh token input', async () => {
            const noTokenResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({});
            expect(noTokenResponse.status).toBe(400);
            expect(noTokenResponse.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
    describe('Profile Endpoint Validation', () => {
        it('should validate profile update input', async () => {
            const emptyUpdateResponse = await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});
            expect(emptyUpdateResponse.status).toBe(400);
            const validUpdateResponse = await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                targetIndustry: 'Technology'
            });
            expect(validUpdateResponse.status).toBe(200);
        });
        it('should validate target role input', async () => {
            const missingFieldsResponse = await (0, supertest_1.default)(app)
                .put('/api/profile/target-role')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                targetIndustry: 'Technology'
            });
            expect(missingFieldsResponse.status).toBe(400);
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
    describe('Session Endpoint Validation', () => {
        let sessionId;
        beforeAll(async () => {
            const sessionResponse = await (0, supertest_1.default)(app)
                .post('/api/sessions/start')
                .set('Authorization', `Bearer ${authToken}`);
            sessionId = sessionResponse.body.sessionId;
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
    describe('Subscription Endpoint Validation', () => {
        it('should validate subscription upgrade input', async () => {
            const invalidTierResponse = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                tier: 'INVALID_TIER'
            });
            expect(invalidTierResponse.status).toBe(400);
            const missingTierResponse = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});
            expect(missingTierResponse.status).toBe(400);
            const validResponse = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                tier: 'PAID'
            });
            expect(validResponse.status).toBe(200);
        });
    });
    describe('Dashboard Endpoint Validation', () => {
        it('should validate insights query parameters', async () => {
            const invalidLimitResponse = await (0, supertest_1.default)(app)
                .get('/api/dashboard/insights?limit=100')
                .set('Authorization', `Bearer ${authToken}`);
            expect(invalidLimitResponse.status).toBe(400);
            const validResponse = await (0, supertest_1.default)(app)
                .get('/api/dashboard/insights?limit=10')
                .set('Authorization', `Bearer ${authToken}`);
            expect(validResponse.status).toBe(200);
        });
        it('should validate trends query parameters', async () => {
            const invalidDaysResponse = await (0, supertest_1.default)(app)
                .get('/api/dashboard/trends?days=1000')
                .set('Authorization', `Bearer ${authToken}`);
            expect(invalidDaysResponse.status).toBe(400);
            const zeroDaysResponse = await (0, supertest_1.default)(app)
                .get('/api/dashboard/trends?days=0')
                .set('Authorization', `Bearer ${authToken}`);
            expect(zeroDaysResponse.status).toBe(400);
            const validResponse = await (0, supertest_1.default)(app)
                .get('/api/dashboard/trends?days=30')
                .set('Authorization', `Bearer ${authToken}`);
            expect(validResponse.status).toBe(200);
        });
    });
    describe('Input Sanitization', () => {
        it('should sanitize XSS attempts in profile updates', async () => {
            const xssPayload = '<script>alert("xss")</script>';
            const response = await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                targetIndustry: `Technology${xssPayload}`,
                targetJobTitle: `Engineer${xssPayload}`
            });
            expect(response.status).toBe(200);
            expect(response.body.targetIndustry).not.toContain('<script>');
            expect(response.body.targetJobTitle).not.toContain('<script>');
        });
        it('should handle SQL injection attempts', async () => {
            const sqlPayload = "'; DROP TABLE users; --";
            const response = await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                targetIndustry: `Technology${sqlPayload}`
            });
            expect(response.status).toBe(200);
        });
        it('should trim whitespace from inputs', async () => {
            const response = await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                targetIndustry: '  Technology  ',
                targetJobTitle: '  Software Engineer  '
            });
            expect(response.status).toBe(200);
            expect(response.body.targetIndustry).toBe('Technology');
            expect(response.body.targetJobTitle).toBe('Software Engineer');
        });
    });
    describe('File Upload Validation', () => {
        it('should validate file types for resume upload', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('resume', Buffer.from('fake file content'), {
                filename: 'test.txt',
                contentType: 'text/plain'
            });
            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Invalid file type');
        });
        it('should validate file size limits', async () => {
            const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
            const response = await (0, supertest_1.default)(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('resume', largeBuffer, {
                filename: 'large-resume.pdf',
                contentType: 'application/pdf'
            });
            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('File too large');
        });
    });
    describe('Error Response Format Consistency', () => {
        it('should return consistent error format across all endpoints', async () => {
            const endpoints = [
                { method: 'post', path: '/api/auth/register', body: { email: 'invalid' } },
                { method: 'post', path: '/api/auth/login', body: { email: 'invalid' } },
                { method: 'put', path: '/api/profile', body: {}, auth: true },
                { method: 'get', path: '/api/sessions/invalid-uuid', auth: true },
                { method: 'post', path: '/api/subscription/upgrade', body: { tier: 'INVALID' }, auth: true }
            ];
            for (const endpoint of endpoints) {
                let req;
                if (endpoint.method === 'get') {
                    req = (0, supertest_1.default)(app).get(endpoint.path);
                }
                else if (endpoint.method === 'post') {
                    req = (0, supertest_1.default)(app).post(endpoint.path);
                }
                else if (endpoint.method === 'put') {
                    req = (0, supertest_1.default)(app).put(endpoint.path);
                }
                else {
                    continue;
                }
                if (endpoint.auth) {
                    req = req.set('Authorization', `Bearer ${authToken}`);
                }
                if (endpoint.body) {
                    req = req.send(endpoint.body);
                }
                const response = await req;
                expect(response.status).toBe(400);
                expect(response.body.error).toBeDefined();
                expect(response.body.error.code).toBeDefined();
                expect(response.body.error.message).toBeDefined();
                expect(response.body.timestamp).toBeDefined();
                expect(response.body.path).toBeDefined();
            }
        });
    });
});
//# sourceMappingURL=validation-integration.test.js.map