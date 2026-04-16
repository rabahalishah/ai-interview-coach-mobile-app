"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = createAuthRoutes;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const error_1 = require("../middleware/error");
const validation_1 = require("../middleware/validation");
function toSafeUser(user) {
    const { passwordHash, ...safe } = user;
    return safe;
}
function createAuthRoutes(services) {
    const router = (0, express_1.Router)();
    const { authService } = services;
    router.post('/register', rateLimiting_1.authRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.register), (0, error_1.asyncHandler)(async (req, res) => {
        const { email, password } = req.body;
        const result = await authService.register(email, password);
        res.status(201).json({
            success: true,
            message: 'Account created. Check your email for a verification code.',
            data: {
                user: toSafeUser(result.user)
            }
        });
    }));
    router.post('/verify-email', rateLimiting_1.passwordResetRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.verifyEmail), (0, error_1.asyncHandler)(async (req, res) => {
        const { email, otp } = req.body;
        const result = await authService.verifyEmail(email, otp);
        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                user: toSafeUser(result.user),
                token: result.token
            }
        });
    }));
    router.post('/resend-verification', rateLimiting_1.passwordResetRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.resendVerification), (0, error_1.asyncHandler)(async (req, res) => {
        const { email } = req.body;
        await authService.resendVerificationEmail(email);
        res.status(200).json({
            success: true,
            message: 'If an account exists and needs verification, you will receive an email.'
        });
    }));
    router.post('/login', rateLimiting_1.authRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.login), (0, error_1.asyncHandler)(async (req, res) => {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: toSafeUser(result.user),
                token: result.token
            }
        });
    }));
    router.post('/logout', auth_1.authenticate, (0, error_1.asyncHandler)(async (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            res.status(400).json({
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Authorization token is required'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        await authService.logout(token);
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    }));
    router.get('/me', auth_1.authenticate, (0, error_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        res.status(200).json({
            id: user.id,
            email: user.email,
            subscriptionTier: user.subscriptionTier,
            emailVerified: user.emailVerified,
            pendingEmail: user.pendingEmail ?? null,
            onboardingCompletedAt: user.onboardingCompletedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    }));
    router.post('/refresh', rateLimiting_1.authRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.refresh), (0, error_1.asyncHandler)(async (req, res) => {
        const { refreshToken } = req.body;
        const newToken = await authService.refreshToken(refreshToken);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken
            }
        });
    }));
    router.post('/google', rateLimiting_1.authRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.google), (0, error_1.asyncHandler)(async (req, res) => {
        const { idToken } = req.body;
        const result = await authService.loginWithGoogle(idToken);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: toSafeUser(result.user),
                token: result.token
            }
        });
    }));
    router.post('/forgot-password', rateLimiting_1.passwordResetRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.forgotPassword), (0, error_1.asyncHandler)(async (req, res) => {
        const { email } = req.body;
        await authService.requestPasswordReset(email);
        res.status(200).json({
            success: true,
            message: 'If an account exists with this email, you will receive a password reset code.'
        });
    }));
    router.post('/verify-otp', rateLimiting_1.passwordResetRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.verifyOtp), (0, error_1.asyncHandler)(async (req, res) => {
        const { email, otp } = req.body;
        const { resetToken } = await authService.verifyOTP(email, otp);
        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            resetToken
        });
    }));
    router.post('/reset-password', rateLimiting_1.authRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.resetPassword), (0, error_1.asyncHandler)(async (req, res) => {
        const { resetToken, newPassword } = req.body;
        await authService.resetPassword(resetToken, newPassword);
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    }));
    router.post('/change-password', auth_1.authenticate, rateLimiting_1.authRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.changePassword), (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(userId, currentPassword, newPassword);
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    }));
    router.post('/change-email/request', auth_1.authenticate, rateLimiting_1.authRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.changeEmailRequest), (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const { newEmail, password } = req.body;
        const user = await authService.requestEmailChange(userId, newEmail, password);
        res.status(200).json({
            success: true,
            message: user.pendingEmail
                ? 'Check your new email for a confirmation code.'
                : 'Email unchanged; any pending change was cleared.',
            user: toSafeUser(user)
        });
    }));
    router.post('/change-email/confirm', auth_1.authenticate, rateLimiting_1.passwordResetRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.changeEmailConfirm), (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const { otp } = req.body;
        const { user, token } = await authService.confirmEmailChange(userId, otp);
        res.status(200).json({
            success: true,
            message: 'Email updated successfully',
            data: {
                user: toSafeUser(user),
                token
            }
        });
    }));
    router.post('/change-email/resend', auth_1.authenticate, rateLimiting_1.passwordResetRateLimit, (0, validation_1.validateRequest)(validation_1.validationSchemas.auth.changeEmailResend), (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        await authService.resendEmailChangeOtp(userId);
        res.status(200).json({
            success: true,
            message: 'If you have a pending email change, a new code was sent.'
        });
    }));
    router.get('/validate', auth_1.authenticate, (0, error_1.asyncHandler)(async (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Token is valid',
            user: {
                id: req.user.id,
                email: req.user.email,
                subscriptionTier: req.user.subscriptionTier,
                emailVerified: req.user.emailVerified,
                pendingEmail: req.user.pendingEmail ?? null
            }
        });
    }));
    return router;
}
exports.default = createAuthRoutes;
//# sourceMappingURL=auth.js.map