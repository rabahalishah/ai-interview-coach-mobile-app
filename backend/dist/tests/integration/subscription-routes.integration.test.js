"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
const index_1 = require("../../src/index");
const AuthService_1 = require("../../src/services/AuthService");
const SubscriptionService_1 = require("../../src/services/SubscriptionService");
const safePrismaCleanup_1 = require("./helpers/safePrismaCleanup");
const prisma = new client_1.PrismaClient();
describe('Subscription Routes Integration Tests', () => {
    let app;
    let authToken;
    let userId;
    beforeAll(async () => {
        app = await (0, index_1.createApp)();
        await prisma.usageTracking.deleteMany({
            where: {
                user: {
                    email: {
                        contains: 'subscription-test'
                    }
                }
            }
        });
        await prisma.user.deleteMany({
            where: {
                email: {
                    contains: 'subscription-test'
                }
            }
        });
    });
    beforeEach(async () => {
        const { user } = await AuthService_1.authService.register('subscription-test@example.com', 'Password123!');
        userId = user.id;
        await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: true }
        });
        await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma, {
            email: 'subscription-test@example.com'
        });
        const session = await AuthService_1.authService.login('subscription-test@example.com', 'Password123!');
        authToken = session.token;
    });
    afterEach(async () => {
        await prisma.usageTracking.deleteMany({
            where: { userId }
        });
        await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma, {
            email: 'subscription-test@example.com'
        });
        await prisma.user.delete({
            where: { id: userId }
        });
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    describe('GET /api/subscription/info', () => {
        it('should return subscription info for free user', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/subscription/info')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    tier: SubscriptionService_1.SubscriptionTier.FREE,
                    currentUsage: 0,
                    limit: 3,
                    canCreateSession: true
                }
            });
        });
        it('should return subscription info for paid user', async () => {
            await prisma.user.update({
                where: { id: userId },
                data: { subscriptionTier: SubscriptionService_1.SubscriptionTier.PAID }
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/subscription/info')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    tier: SubscriptionService_1.SubscriptionTier.PAID,
                    currentUsage: 0,
                    limit: null,
                    canCreateSession: true
                }
            });
        });
        it('should require authentication', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/subscription/info')
                .expect(401);
        });
    });
    describe('POST /api/subscription/upgrade', () => {
        it('should upgrade subscription to paid tier', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ tier: SubscriptionService_1.SubscriptionTier.PAID })
                .expect(200);
            expect(response.body).toEqual({
                success: true,
                message: 'Subscription upgraded to paid tier successfully',
                data: {
                    tier: SubscriptionService_1.SubscriptionTier.PAID
                }
            });
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            expect(user?.subscriptionTier).toBe(SubscriptionService_1.SubscriptionTier.PAID);
        });
        it('should allow downgrade to free tier', async () => {
            await prisma.user.update({
                where: { id: userId },
                data: { subscriptionTier: SubscriptionService_1.SubscriptionTier.PAID }
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ tier: SubscriptionService_1.SubscriptionTier.FREE })
                .expect(200);
            expect(response.body).toEqual({
                success: true,
                message: 'Subscription upgraded to free tier successfully',
                data: {
                    tier: SubscriptionService_1.SubscriptionTier.FREE
                }
            });
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            expect(user?.subscriptionTier).toBe(SubscriptionService_1.SubscriptionTier.FREE);
        });
        it('should reject invalid tier', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ tier: 'invalid' })
                .expect(400);
            expect(response.body.error.code).toBe('INVALID_TIER');
        });
        it('should require authentication', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .send({ tier: SubscriptionService_1.SubscriptionTier.PAID })
                .expect(401);
        });
        it('should require tier in request body', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/subscription/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);
            expect(response.body.error.code).toBe('INVALID_TIER');
        });
    });
});
//# sourceMappingURL=subscription-routes.integration.test.js.map