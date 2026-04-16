"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../src/index");
const AuthService_1 = require("../../src/services/AuthService");
const prisma_1 = __importDefault(require("../../src/lib/prisma"));
const safePrismaCleanup_1 = require("./helpers/safePrismaCleanup");
describe('Profile Routes Integration Tests', () => {
    let app;
    let authToken;
    let userId;
    beforeAll(async () => {
        app = await (0, index_1.createApp)();
        const { user } = await AuthService_1.authService.register('test@example.com', 'Password123!');
        userId = user.id;
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { emailVerified: true }
        });
        await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma_1.default, { email: 'test@example.com' });
        const session = await AuthService_1.authService.login('test@example.com', 'Password123!');
        authToken = session.token;
    });
    afterAll(async () => {
        await prisma_1.default.userProfile.deleteMany({
            where: { userId }
        });
        await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma_1.default, { email: 'test@example.com' });
        await prisma_1.default.user.deleteMany({
            where: { email: 'test@example.com' }
        });
        await prisma_1.default.$disconnect();
    });
    describe('GET /api/profile', () => {
        it('should get user profile successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('userId', userId);
        });
        it('should return 401 without auth token', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/profile')
                .expect(401);
        });
    });
    describe('PUT /api/profile', () => {
        it('should update profile successfully', async () => {
            const updateData = {
                targetIndustry: 'Technology',
                targetJobTitle: 'Software Engineer',
                experienceLevel: 'mid'
            };
            const response = await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.targetIndustry).toBe('Technology');
            expect(response.body.data.targetJobTitle).toBe('Software Engineer');
        });
        it('should return 400 for invalid data', async () => {
            const invalidData = {
                targetIndustry: '',
                targetJobTitle: 'Software Engineer'
            };
            await (0, supertest_1.default)(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);
        });
    });
    describe('PUT /api/profile/target-role', () => {
        it('should set target role successfully', async () => {
            const targetRole = {
                industry: 'Technology',
                jobTitle: 'Software Engineer'
            };
            const response = await (0, supertest_1.default)(app)
                .put('/api/profile/target-role')
                .set('Authorization', `Bearer ${authToken}`)
                .send(targetRole)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Target role updated successfully');
        });
        it('should return 400 for invalid industry', async () => {
            const invalidRole = {
                industry: 'InvalidIndustry',
                jobTitle: 'Software Engineer'
            };
            await (0, supertest_1.default)(app)
                .put('/api/profile/target-role')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidRole)
                .expect(400);
        });
    });
    describe('GET /api/profile/ai-attributes', () => {
        it('should get AI attributes successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/profile/ai-attributes')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });
    });
    describe('POST /api/profile/resume', () => {
        it('should handle missing file', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });
});
//# sourceMappingURL=profile-routes.integration.test.js.map