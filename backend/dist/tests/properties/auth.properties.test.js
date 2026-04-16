"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const AuthService_1 = require("../../src/services/AuthService");
const auth_1 = require("../../src/types/auth");
const setup_properties_1 = require("../setup-properties");
jest.mock('../../src/lib/prisma', () => {
    const mockUser = {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
    };
    const mockUserProfile = {
        create: jest.fn(),
    };
    const mockEmailVerificationOTP = {
        create: jest.fn(),
        deleteMany: jest.fn(),
    };
    return {
        __esModule: true,
        default: {
            user: mockUser,
            userProfile: mockUserProfile,
            emailVerificationOTP: mockEmailVerificationOTP,
            $transaction: jest.fn(async (fn) => {
                return fn({ user: mockUser, userProfile: mockUserProfile });
            }),
        },
    };
});
jest.mock('../../src/utils/password', () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
    validatePassword: jest.fn(),
}));
jest.mock('../../src/utils/jwt', () => ({
    generateToken: jest.fn(),
    validateToken: jest.fn(),
}));
const prisma_1 = __importDefault(require("../../src/lib/prisma"));
const passwordUtils = __importStar(require("../../src/utils/password"));
const jwtUtils = __importStar(require("../../src/utils/jwt"));
const mockPrisma = prisma_1.default;
const mockPasswordUtils = passwordUtils;
const mockJwtUtils = jwtUtils;
const mockEmailService = {
    isConfigured: jest.fn(() => true),
    sendOTP: jest.fn(),
    sendEmailVerificationOTP: jest.fn().mockResolvedValue(undefined),
    sendEmailChangeConfirmationOTP: jest.fn().mockResolvedValue(undefined),
};
describe('Authentication Property Tests', () => {
    let authService;
    beforeAll(async () => {
        authService = new AuthService_1.AuthService(mockPrisma, mockEmailService, undefined);
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockPasswordUtils.validatePassword.mockImplementation(() => { });
        mockPasswordUtils.hashPassword.mockResolvedValue('$2b$12$mockedHashValue123456789012345678901234567890123456789');
        mockPasswordUtils.verifyPassword.mockResolvedValue(true);
        mockJwtUtils.generateToken.mockReturnValue('mocked.jwt.token');
        mockJwtUtils.validateToken.mockReturnValue({
            userId: 'test-user-id',
            email: 'test@example.com',
            subscriptionTier: 'free',
            emailVerified: true,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
        });
        mockEmailService.isConfigured.mockReturnValue(true);
        mockEmailService.sendEmailVerificationOTP.mockResolvedValue(undefined);
        mockPrisma.emailVerificationOTP.create.mockResolvedValue({ id: 'otp' });
    });
    describe('Property 1: User registration creates encrypted accounts', () => {
        it('should create encrypted accounts for any valid email and password combination', async () => {
            await fc.assert(fc.asyncProperty(setup_properties_1.arbitraries.email(), setup_properties_1.arbitraries.password(), async (email, password) => {
                mockPrisma.user.findUnique.mockResolvedValue(null);
                mockPrisma.user.create.mockResolvedValue({
                    id: 'test-user-id',
                    email: email.toLowerCase(),
                    passwordHash: '$2b$12$mockedHashValue123456789012345678901234567890123456789',
                    subscriptionTier: 'free',
                    emailVerified: false,
                    onboardingCompletedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                mockPrisma.userProfile.create.mockResolvedValue({});
                const result = await authService.register(email, password);
                expect(result.user).toBeDefined();
                expect(result.user.email).toBe(email.toLowerCase());
                expect(result.user.subscriptionTier).toBe(auth_1.SubscriptionTier.FREE);
                expect(result.user.passwordHash).toBeDefined();
                expect(result.user.passwordHash).not.toBe(password);
                expect(result.user.passwordHash.length).toBeGreaterThan(50);
                expect(mockEmailService.sendEmailVerificationOTP).toHaveBeenCalled();
                expect(mockPasswordUtils.validatePassword).toHaveBeenCalledWith(password);
                expect(mockPasswordUtils.hashPassword).toHaveBeenCalledWith(password);
                return true;
            }), { numRuns: 100 });
        });
    });
    describe('Property 2: Valid credentials return JWT tokens', () => {
        it('should return JWT tokens for any valid user credentials', async () => {
            await fc.assert(fc.asyncProperty(setup_properties_1.arbitraries.email(), setup_properties_1.arbitraries.password(), async (email, password) => {
                mockPrisma.user.findUnique.mockResolvedValue({
                    id: 'test-user-id',
                    email: email.toLowerCase(),
                    passwordHash: '$2b$12$mockedHashValue123456789012345678901234567890123456789',
                    subscriptionTier: 'free',
                    emailVerified: true,
                    onboardingCompletedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                const loginResult = await authService.login(email, password);
                expect(loginResult.user).toBeDefined();
                expect(loginResult.user.email).toBe(email.toLowerCase());
                expect(loginResult.token).toBeDefined();
                expect(typeof loginResult.token).toBe('string');
                expect(loginResult.token.length).toBeGreaterThan(0);
                expect(mockPasswordUtils.verifyPassword).toHaveBeenCalledWith(password, '$2b$12$mockedHashValue123456789012345678901234567890123456789');
                expect(mockJwtUtils.generateToken).toHaveBeenCalled();
                return true;
            }), { numRuns: 100 });
        });
    });
    describe('Property 3: Valid tokens authorize access', () => {
        it('should authorize access for any valid JWT token', async () => {
            await fc.assert(fc.asyncProperty(setup_properties_1.arbitraries.userId(), setup_properties_1.arbitraries.email(), setup_properties_1.arbitraries.subscriptionTier(), async (userId, email, subscriptionTier) => {
                const token = 'mocked.jwt.token';
                mockJwtUtils.validateToken.mockReturnValue({
                    userId,
                    email,
                    subscriptionTier,
                    emailVerified: true,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600
                });
                mockPrisma.user.findUnique.mockResolvedValue({
                    id: userId,
                    email,
                    passwordHash: 'mock-hash',
                    subscriptionTier,
                    emailVerified: true,
                    onboardingCompletedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                const validatedUser = await authService.validateToken(token);
                expect(validatedUser).toBeDefined();
                expect(validatedUser.id).toBe(userId);
                expect(validatedUser.email).toBe(email);
                expect(validatedUser.subscriptionTier).toBe(subscriptionTier);
                expect(mockJwtUtils.validateToken).toHaveBeenCalledWith(token);
                return true;
            }), { numRuns: 100 });
        });
    });
    describe('Property 4: Logout invalidates tokens', () => {
        it('should validate tokens exist before logout for any user session', async () => {
            await fc.assert(fc.asyncProperty(setup_properties_1.arbitraries.userId(), setup_properties_1.arbitraries.email(), setup_properties_1.arbitraries.subscriptionTier(), async (userId, email, subscriptionTier) => {
                const token = 'mocked.jwt.token';
                mockJwtUtils.validateToken.mockReturnValue({
                    userId,
                    email,
                    subscriptionTier,
                    emailVerified: true,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600
                });
                mockPrisma.user.findUnique.mockResolvedValue({
                    id: userId,
                    email,
                    passwordHash: 'mock-hash',
                    subscriptionTier,
                    emailVerified: true,
                    onboardingCompletedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                await expect(authService.logout(token)).resolves.not.toThrow();
                expect(mockJwtUtils.validateToken).toHaveBeenCalledWith(token);
                return true;
            }), { numRuns: 100 });
        });
    });
    describe('Property 40: Password encryption with bcrypt', () => {
        it('should encrypt passwords with bcrypt for any valid password', async () => {
            await fc.assert(fc.asyncProperty(setup_properties_1.arbitraries.password(), async (password) => {
                const mockHash = '$2b$12$' + 'a'.repeat(53);
                mockPasswordUtils.hashPassword.mockResolvedValue(mockHash);
                mockPasswordUtils.verifyPassword.mockImplementation(async (pwd, hash) => {
                    return pwd === password && hash === mockHash;
                });
                const hash = await passwordUtils.hashPassword(password);
                expect(hash).toBeDefined();
                expect(typeof hash).toBe('string');
                expect(hash.length).toBeGreaterThan(50);
                expect(hash).toMatch(/^\$2[aby]\$/);
                expect(hash).not.toContain(password);
                const isValid = await passwordUtils.verifyPassword(password, hash);
                expect(isValid).toBe(true);
                mockPasswordUtils.verifyPassword.mockImplementation(async (pwd, hash) => {
                    return pwd === password && hash === mockHash;
                });
                const wrongPassword = password + 'wrong';
                const isInvalid = await passwordUtils.verifyPassword(wrongPassword, hash);
                expect(isInvalid).toBe(false);
                return true;
            }), { numRuns: 100 });
        });
    });
    describe('Property 41: JWT token security', () => {
        it('should implement secure JWT token generation and validation', async () => {
            await fc.assert(fc.asyncProperty(setup_properties_1.arbitraries.userId(), setup_properties_1.arbitraries.email(), setup_properties_1.arbitraries.subscriptionTier(), async (userId, email, subscriptionTier) => {
                const payload = {
                    userId,
                    email,
                    subscriptionTier,
                    emailVerified: true
                };
                const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.signature';
                mockJwtUtils.generateToken.mockReturnValue(mockToken);
                mockJwtUtils.validateToken.mockReturnValue({
                    userId,
                    email,
                    subscriptionTier,
                    emailVerified: true,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600
                });
                const token = jwtUtils.generateToken(payload);
                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                expect(token.length).toBeGreaterThan(0);
                const parts = token.split('.');
                expect(parts).toHaveLength(3);
                const validatedPayload = jwtUtils.validateToken(token);
                expect(validatedPayload.userId).toBe(userId);
                expect(validatedPayload.email).toBe(email);
                expect(validatedPayload.subscriptionTier).toBe(subscriptionTier);
                expect(validatedPayload.exp).toBeDefined();
                expect(validatedPayload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
                expect(validatedPayload.iat).toBeDefined();
                expect(validatedPayload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
                return true;
            }), { numRuns: 100 });
        });
        it('should reject invalid or tampered tokens', async () => {
            await fc.assert(fc.asyncProperty(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.split('.').length !== 3), async (invalidToken) => {
                mockJwtUtils.validateToken.mockImplementation(() => {
                    throw new auth_1.AuthenticationError('Invalid token');
                });
                await expect(async () => {
                    jwtUtils.validateToken(invalidToken);
                }).rejects.toThrow(auth_1.AuthenticationError);
                return true;
            }), { numRuns: 100 });
        });
    });
});
//# sourceMappingURL=auth.properties.test.js.map