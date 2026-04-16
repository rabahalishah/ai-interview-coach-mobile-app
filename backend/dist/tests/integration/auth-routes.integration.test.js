"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../src/routes/auth"));
const error_1 = require("../../src/middleware/error");
const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    validateToken: jest.fn(),
    loginWithGoogle: jest.fn(),
    requestPasswordReset: jest.fn(),
    verifyOTP: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    requestEmailChange: jest.fn(),
    confirmEmailChange: jest.fn(),
    resendEmailChangeOtp: jest.fn(),
};
jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn()
        }
    }
}));
const auth_2 = require("../../src/types/auth");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const authRouter = (0, auth_1.default)({ authService: mockAuthService });
app.use('/api/auth', authRouter);
app.use(error_1.errorHandler);
describe('Authentication Routes Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/auth/register', () => {
        it('should successfully register a user with valid data', async () => {
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
            expect(response.body.message).toContain('verification');
            expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'Password123!');
        });
        it('should return 400 for invalid email format', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'invalid-email',
                password: 'Password123!'
            });
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(mockAuthService.register).not.toHaveBeenCalled();
        });
        it('should return 400 for weak password', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'weak'
            });
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(mockAuthService.register).not.toHaveBeenCalled();
        });
        it('should return 400 for missing required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(mockAuthService.register).not.toHaveBeenCalled();
        });
    });
    describe('POST /api/auth/login', () => {
        it('should successfully login with valid credentials', async () => {
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
            expect(response.body.message).toBe('Login successful');
            expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'Password123!');
        });
        it('should return 400 for missing password', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com'
            });
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(mockAuthService.login).not.toHaveBeenCalled();
        });
    });
    describe('POST /api/auth/refresh', () => {
        it('should successfully refresh token', async () => {
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
            expect(response.body.message).toBe('Token refreshed successfully');
            expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-jwt-token-123');
        });
        it('should return 400 for missing token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
        });
    });
    describe('Error Handling', () => {
        it('should handle service errors gracefully', async () => {
            mockAuthService.register.mockRejectedValue(new Error('Database connection failed'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'Password123!'
            });
            expect(response.status).toBe(500);
            expect(response.body.error.code).toBe('INTERNAL_ERROR');
        });
    });
    describe('Rate Limiting', () => {
        it('should apply rate limiting to registration endpoint', async () => {
            mockAuthService.register.mockRejectedValue(new Error('Registration failed'));
            const requests = Array(12).fill(null).map(() => (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'Password123!'
            }));
            const responses = await Promise.all(requests);
            const hasRateLimited = responses.some(r => r.status === 429);
            expect(hasRateLimited).toBe(true);
        });
    });
});
//# sourceMappingURL=auth-routes.integration.test.js.map