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
exports.authService = exports.AuthService = void 0;
const bcrypt = __importStar(require("bcrypt"));
const google_auth_library_1 = require("google-auth-library");
const auth_1 = require("../types/auth");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const prisma_1 = __importDefault(require("../lib/prisma"));
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;
class AuthService {
    constructor(prismaInstance, emailService, googleClientId) {
        this.prismaInstance = prismaInstance;
        this.emailService = emailService;
        this.googleClientId = googleClientId;
    }
    get prisma() {
        return this.prismaInstance || prisma_1.default;
    }
    dbUserToUser(dbUser) {
        return {
            id: dbUser.id,
            email: dbUser.email,
            passwordHash: dbUser.passwordHash,
            subscriptionTier: dbUser.subscriptionTier,
            emailVerified: dbUser.emailVerified,
            pendingEmail: dbUser.pendingEmail ?? null,
            onboardingCompletedAt: dbUser.onboardingCompletedAt,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt
        };
    }
    tokenPayload(user) {
        return {
            userId: user.id,
            email: user.email,
            subscriptionTier: user.subscriptionTier,
            emailVerified: user.emailVerified
        };
    }
    async register(email, password) {
        try {
            if (!email || !password) {
                throw new auth_1.ValidationError('Email and password are required');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new auth_1.ValidationError('Invalid email format');
            }
            (0, password_1.validatePassword)(password);
            const normalizedEmail = email.toLowerCase();
            const existingUser = await this.prisma.user.findUnique({
                where: { email: normalizedEmail }
            });
            if (existingUser) {
                throw new auth_1.ValidationError('User with this email already exists');
            }
            const emailConfigured = this.emailService?.isConfigured() === true;
            if (!emailConfigured && process.env.NODE_ENV !== 'test') {
                throw new auth_1.ValidationError('Email verification is not configured. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS.');
            }
            const passwordHash = await (0, password_1.hashPassword)(password);
            const dbUser = await this.prisma.$transaction(async (tx) => {
                const userRow = await tx.user.create({
                    data: {
                        email: normalizedEmail,
                        passwordHash,
                        subscriptionTier: auth_1.SubscriptionTier.FREE,
                        emailVerified: false
                    }
                });
                await tx.userProfile.create({
                    data: {
                        userId: userRow.id,
                        aiAttributes: {},
                        extractedSkills: []
                    }
                });
                return userRow;
            });
            if (!emailConfigured) {
                return { user: this.dbUserToUser(dbUser) };
            }
            const otp = this.generateOTP();
            const otpHash = await bcrypt.hash(otp, 10);
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
            try {
                await this.prisma.emailVerificationOTP.create({
                    data: {
                        email: normalizedEmail,
                        otpHash,
                        expiresAt
                    }
                });
                await this.emailService.sendEmailVerificationOTP(normalizedEmail, otp);
            }
            catch (sendErr) {
                await this.prisma.emailVerificationOTP.deleteMany({ where: { email: normalizedEmail } });
                await this.prisma.user.delete({ where: { id: dbUser.id } }).catch(() => { });
                console.error('Registration email send failed:', sendErr);
                throw new auth_1.ExternalServiceError('Could not send verification email. Please try again later.', {
                    cause: sendErr.message
                });
            }
            return { user: this.dbUserToUser(dbUser) };
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError ||
                error instanceof auth_1.AuthenticationError ||
                error instanceof auth_1.ExternalServiceError) {
                throw error;
            }
            console.error('Registration error:', error);
            throw new auth_1.AuthenticationError('Registration failed', {
                error: error.message,
                stack: error.stack
            });
        }
    }
    async verifyEmail(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (!user || user.authProvider !== 'local') {
            throw new auth_1.AuthenticationError('Invalid or expired verification code');
        }
        if (user.emailVerified) {
            const u = this.dbUserToUser(user);
            return { user: u, token: (0, jwt_1.generateToken)(this.tokenPayload(u)) };
        }
        const records = await this.prisma.emailVerificationOTP.findMany({
            where: { email: normalizedEmail },
            orderBy: { createdAt: 'desc' }
        });
        let matched = false;
        for (const record of records) {
            if (new Date() > record.expiresAt)
                continue;
            const isValid = await (0, password_1.verifyPassword)(otp, record.otpHash);
            if (isValid) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            throw new auth_1.AuthenticationError('Invalid or expired verification code');
        }
        await this.prisma.emailVerificationOTP.deleteMany({
            where: { email: normalizedEmail }
        });
        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true }
        });
        const appUser = this.dbUserToUser(updated);
        return {
            user: appUser,
            token: (0, jwt_1.generateToken)(this.tokenPayload(appUser))
        };
    }
    async resendVerificationEmail(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (!user || user.authProvider !== 'local' || user.emailVerified) {
            return;
        }
        if (!this.emailService?.isConfigured()) {
            throw new auth_1.ValidationError('Email service is not configured. Please contact support.');
        }
        const otp = this.generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.emailVerificationOTP.create({
            data: {
                email: normalizedEmail,
                otpHash,
                expiresAt
            }
        });
        await this.emailService.sendEmailVerificationOTP(normalizedEmail, otp);
    }
    async login(email, password) {
        try {
            if (!email || !password) {
                throw new auth_1.ValidationError('Email and password are required');
            }
            const dbUser = await this.prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });
            if (!dbUser) {
                throw new auth_1.AuthenticationError('Invalid credentials');
            }
            if (!dbUser.passwordHash) {
                throw new auth_1.AuthenticationError('Invalid credentials');
            }
            const isValidPassword = await (0, password_1.verifyPassword)(password, dbUser.passwordHash);
            if (!isValidPassword) {
                throw new auth_1.AuthenticationError('Invalid credentials');
            }
            if (!dbUser.emailVerified) {
                throw new auth_1.EmailNotVerifiedError('Please verify your email before signing in.', {
                    email: dbUser.email
                });
            }
            const user = this.dbUserToUser(dbUser);
            const token = (0, jwt_1.generateToken)(this.tokenPayload(user));
            return { user, token };
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError ||
                error instanceof auth_1.AuthenticationError ||
                error instanceof auth_1.EmailNotVerifiedError) {
                throw error;
            }
            throw new auth_1.AuthenticationError('Login failed', { error: error.message });
        }
    }
    async validateToken(token) {
        try {
            if (!token) {
                throw new auth_1.AuthenticationError('Token is required');
            }
            const payload = (0, jwt_1.validateToken)(token);
            const dbUser = await this.prisma.user.findUnique({
                where: { id: payload.userId }
            });
            if (!dbUser) {
                throw new auth_1.AuthenticationError('User not found');
            }
            return this.dbUserToUser(dbUser);
        }
        catch (error) {
            if (error instanceof auth_1.AuthenticationError) {
                throw error;
            }
            throw new auth_1.AuthenticationError('Token validation failed', { error: error.message });
        }
    }
    async logout(token) {
        try {
            await this.validateToken(token);
        }
        catch (error) {
            if (error instanceof auth_1.AuthenticationError) {
                throw error;
            }
            throw new auth_1.AuthenticationError('Logout failed', { error: error.message });
        }
    }
    async refreshToken(token) {
        try {
            const user = await this.validateToken(token);
            const newToken = (0, jwt_1.generateToken)(this.tokenPayload(user));
            return newToken;
        }
        catch (error) {
            if (error instanceof auth_1.AuthenticationError) {
                throw error;
            }
            throw new auth_1.AuthenticationError('Token refresh failed', { error: error.message });
        }
    }
    async getUserById(userId) {
        try {
            const dbUser = await this.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!dbUser) {
                return null;
            }
            return this.dbUserToUser(dbUser);
        }
        catch (error) {
            throw new auth_1.AuthenticationError('Failed to get user', { error: error.message });
        }
    }
    async updateSubscriptionTier(userId, tier) {
        try {
            const dbUser = await this.prisma.user.update({
                where: { id: userId },
                data: { subscriptionTier: tier }
            });
            return this.dbUserToUser(dbUser);
        }
        catch (error) {
            throw new auth_1.AuthenticationError('Failed to update subscription tier', { error: error.message });
        }
    }
    async loginWithGoogle(idToken) {
        if (!this.googleClientId) {
            throw new auth_1.AuthenticationError('Google Sign-In is not configured');
        }
        const client = new google_auth_library_1.OAuth2Client(this.googleClientId);
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: this.googleClientId
            });
            payload = ticket.getPayload();
        }
        catch (error) {
            throw new auth_1.AuthenticationError('Invalid Google token', { error: error.message });
        }
        if (!payload || !payload.email) {
            throw new auth_1.AuthenticationError('Invalid Google token: missing email');
        }
        const email = payload.email.toLowerCase();
        const googleId = payload.sub;
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, { googleId }]
            }
        });
        if (existingUser) {
            if (existingUser.authProvider === 'local') {
                throw new auth_1.AuthenticationError('An account with this email already exists. Please sign in with your password.');
            }
            const synced = await this.prisma.user.update({
                where: { id: existingUser.id },
                data: { emailVerified: true }
            });
            const user = this.dbUserToUser(synced);
            const token = (0, jwt_1.generateToken)(this.tokenPayload(user));
            return { user, token };
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const dbUser = await tx.user.create({
                data: {
                    email,
                    passwordHash: null,
                    authProvider: 'google',
                    googleId,
                    subscriptionTier: auth_1.SubscriptionTier.FREE,
                    emailVerified: true
                }
            });
            await tx.userProfile.create({
                data: {
                    userId: dbUser.id,
                    aiAttributes: {},
                    extractedSkills: []
                }
            });
            const user = this.dbUserToUser(dbUser);
            const token = (0, jwt_1.generateToken)(this.tokenPayload(user));
            return { user, token };
        });
        return result;
    }
    async requestPasswordReset(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (!user) {
            return;
        }
        if (user.authProvider !== 'local' || !user.passwordHash) {
            return;
        }
        if (!this.emailService?.isConfigured()) {
            throw new auth_1.ValidationError('Email service is not configured. Please contact support.');
        }
        const otp = this.generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.passwordResetOTP.create({
            data: {
                email: normalizedEmail,
                otpHash,
                expiresAt
            }
        });
        await this.emailService.sendOTP(normalizedEmail, otp);
    }
    async verifyOTP(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();
        const records = await this.prisma.passwordResetOTP.findMany({
            where: { email: normalizedEmail },
            orderBy: { createdAt: 'desc' }
        });
        for (const record of records) {
            if (new Date() > record.expiresAt)
                continue;
            const isValid = await (0, password_1.verifyPassword)(otp, record.otpHash);
            if (isValid) {
                await this.prisma.passwordResetOTP.deleteMany({
                    where: { email: normalizedEmail }
                });
                const resetToken = (0, jwt_1.generateResetToken)(normalizedEmail);
                return { resetToken };
            }
        }
        throw new auth_1.AuthenticationError('Invalid or expired OTP');
    }
    async resetPassword(resetToken, newPassword) {
        const payload = (0, jwt_1.validateResetToken)(resetToken);
        (0, password_1.validatePassword)(newPassword);
        const passwordHash = await (0, password_1.hashPassword)(newPassword);
        const user = await this.prisma.user.findUnique({
            where: { email: payload.email }
        });
        if (!user) {
            throw new auth_1.AuthenticationError('User not found');
        }
        if (user.authProvider !== 'local') {
            throw new auth_1.AuthenticationError('Password reset is not available for Google accounts');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const dbUser = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!dbUser) {
            throw new auth_1.AuthenticationError('User not found');
        }
        if (dbUser.authProvider !== 'local' || !dbUser.passwordHash) {
            throw new auth_1.AuthenticationError('Password change is not available for this account');
        }
        const isValid = await (0, password_1.verifyPassword)(currentPassword, dbUser.passwordHash);
        if (!isValid) {
            throw new auth_1.AuthenticationError('Current password is incorrect');
        }
        (0, password_1.validatePassword)(newPassword);
        const passwordHash = await (0, password_1.hashPassword)(newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash }
        });
    }
    async requestEmailChange(userId, newEmail, password) {
        const normalizedNewEmail = newEmail.toLowerCase().trim();
        if (!normalizedNewEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNewEmail)) {
            throw new auth_1.ValidationError('Invalid email format');
        }
        const dbUser = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!dbUser) {
            throw new auth_1.AuthenticationError('User not found');
        }
        if (dbUser.authProvider !== 'local' || !dbUser.passwordHash) {
            throw new auth_1.AuthenticationError('Email change requires password verification. Use your account password.');
        }
        const isValid = await (0, password_1.verifyPassword)(password, dbUser.passwordHash);
        if (!isValid) {
            throw new auth_1.AuthenticationError('Password is incorrect');
        }
        const conflict = await this.prisma.user.findFirst({
            where: {
                AND: [
                    { id: { not: userId } },
                    {
                        OR: [{ email: normalizedNewEmail }, { pendingEmail: normalizedNewEmail }]
                    }
                ]
            }
        });
        if (conflict) {
            throw new auth_1.ValidationError('An account with this email already exists');
        }
        if (normalizedNewEmail === dbUser.email.toLowerCase()) {
            const cleared = await this.prisma.user.update({
                where: { id: userId },
                data: { pendingEmail: null }
            });
            await this.prisma.emailVerificationOTP.deleteMany({ where: { email: normalizedNewEmail } });
            return this.dbUserToUser(cleared);
        }
        if (!this.emailService?.isConfigured()) {
            if (process.env.NODE_ENV === 'test') {
                const updated = await this.prisma.user.update({
                    where: { id: userId },
                    data: { pendingEmail: normalizedNewEmail }
                });
                return this.dbUserToUser(updated);
            }
            throw new auth_1.ValidationError('Email service is not configured. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS.');
        }
        const otp = this.generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.emailVerificationOTP.deleteMany({
            where: { email: normalizedNewEmail }
        });
        await this.prisma.emailVerificationOTP.create({
            data: {
                email: normalizedNewEmail,
                otpHash,
                expiresAt
            }
        });
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { pendingEmail: normalizedNewEmail }
        });
        try {
            await this.emailService.sendEmailChangeConfirmationOTP(normalizedNewEmail, otp);
        }
        catch (sendErr) {
            await this.prisma.emailVerificationOTP.deleteMany({
                where: { email: normalizedNewEmail }
            });
            await this.prisma.user.update({
                where: { id: userId },
                data: { pendingEmail: null }
            });
            console.error('Email change OTP send failed:', sendErr);
            throw new auth_1.ExternalServiceError('Could not send verification email. Please try again later.', {
                cause: sendErr.message
            });
        }
        return this.dbUserToUser(updated);
    }
    async confirmEmailChange(userId, otp) {
        const dbUser = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!dbUser) {
            throw new auth_1.AuthenticationError('User not found');
        }
        if (!dbUser.pendingEmail) {
            throw new auth_1.ValidationError('No pending email change. Request a new code first.');
        }
        const pending = dbUser.pendingEmail.toLowerCase();
        const records = await this.prisma.emailVerificationOTP.findMany({
            where: { email: pending },
            orderBy: { createdAt: 'desc' }
        });
        let matched = false;
        for (const record of records) {
            if (new Date() > record.expiresAt)
                continue;
            const ok = await (0, password_1.verifyPassword)(otp, record.otpHash);
            if (ok) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            throw new auth_1.AuthenticationError('Invalid or expired verification code');
        }
        await this.prisma.emailVerificationOTP.deleteMany({
            where: { email: pending }
        });
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                email: pending,
                pendingEmail: null,
                emailVerified: true
            }
        });
        const appUser = this.dbUserToUser(updated);
        return {
            user: appUser,
            token: (0, jwt_1.generateToken)(this.tokenPayload(appUser))
        };
    }
    async resendEmailChangeOtp(userId) {
        const dbUser = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!dbUser) {
            throw new auth_1.AuthenticationError('User not found');
        }
        if (!dbUser.pendingEmail) {
            throw new auth_1.ValidationError('No pending email change to resend.');
        }
        if (!this.emailService?.isConfigured()) {
            throw new auth_1.ValidationError('Email service is not configured. Please contact support.');
        }
        const pending = dbUser.pendingEmail.toLowerCase();
        const otp = this.generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.emailVerificationOTP.deleteMany({
            where: { email: pending }
        });
        await this.prisma.emailVerificationOTP.create({
            data: {
                email: pending,
                otpHash,
                expiresAt
            }
        });
        await this.emailService.sendEmailChangeConfirmationOTP(pending, otp);
    }
    generateOTP() {
        let otp = '';
        for (let i = 0; i < OTP_LENGTH; i++) {
            otp += Math.floor(Math.random() * 10).toString();
        }
        return otp;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=AuthService.js.map