"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../../src/routes/auth"));
const error_1 = require("../../../src/middleware/error");
const AuthService_1 = require("../../../src/services/AuthService");
const auth_2 = require("../../../src/types/auth");
jest.mock('../../../src/services/AuthService');
const mockAuthService = AuthService_1.authService;
const app = (0, express_1.default)();
app.use(express_1.default.json());
const mockServices = {
    authService: mockAuthService
};
app.use('/api/auth', (0, auth_1.default)(mockServices));
app.use(error_1.errorHandler);
describe('Authentication Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: 'hashed-password',
                subscriptionTier: auth_2.SubscriptionTier.FREE,
                emailVerified: false,
                pendingEmail: null,
                onboardingCompletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockAuthService.register.mockResolvedValue({
                user: mockUser
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'Password123!'
            });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('test@example.com');
            expect(response.body.data.user.subscriptionTier).toBe(auth_2.SubscriptionTier.FREE);
            expect(response.body.data.token).toBeUndefined();
            expect(response.body.data.user.passwordHash).toBeUndefined();
        });
        it('should return validation error for invalid email', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'invalid-email',
                password: 'Password123!'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBeFalsy();
        });
        it('should return validation error for weak password', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'weak'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBeFalsy();
        });
        it('should return validation error for missing fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.success).toBeFalsy();
        });
    });
    describe('POST /api/auth/login', () => {
        it('should login user successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: 'hashed-password',
                subscriptionTier: auth_2.SubscriptionTier.FREE,
                emailVerified: true,
                pendingEmail: null,
                onboardingCompletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const mockToken = 'jwt-token-123';
            mockAuthService.login.mockResolvedValue({
                user: mockUser,
                token: mockToken
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'Password123!'
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('test@example.com');
            expect(response.body.data.token).toBe(mockToken);
            expect(response.body.data.user.passwordHash).toBeUndefined();
        });
        it('should return validation error for missing fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBeFalsy();
        });
    });
    describe('POST /api/auth/refresh', () => {
        it('should refresh token successfully', async () => {
            const newToken = 'new-jwt-token-456';
            mockAuthService.refreshToken.mockResolvedValue(newToken);
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: 'old-jwt-token-123'
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBe(newToken);
        });
        it('should return validation error for missing token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.success).toBeFalsy();
        });
    });
    describe('Error Handling', () => {
        it('should handle AuthService errors properly', async () => {
            mockAuthService.register.mockRejectedValue(new Error('Database connection failed'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'Password123!'
            });
            expect(response.status).toBe(500);
            expect(response.body.success).toBeFalsy();
        });
    });
});
//# sourceMappingURL=auth.test.js.map