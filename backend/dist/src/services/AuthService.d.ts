import { User, AuthService as IAuthService, SubscriptionTier } from '../types/auth';
import { PrismaClient } from '@prisma/client';
import { IEmailService } from './EmailService';
export declare class AuthService implements IAuthService {
    private prismaInstance?;
    private emailService?;
    private googleClientId?;
    constructor(prismaInstance?: PrismaClient | undefined, emailService?: IEmailService | undefined, googleClientId?: string | undefined);
    private get prisma();
    private dbUserToUser;
    private tokenPayload;
    register(email: string, password: string): Promise<{
        user: User;
    }>;
    verifyEmail(email: string, otp: string): Promise<{
        user: User;
        token: string;
    }>;
    resendVerificationEmail(email: string): Promise<void>;
    login(email: string, password: string): Promise<{
        user: User;
        token: string;
    }>;
    validateToken(token: string): Promise<User>;
    logout(token: string): Promise<void>;
    refreshToken(token: string): Promise<string>;
    getUserById(userId: string): Promise<User | null>;
    updateSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<User>;
    loginWithGoogle(idToken: string): Promise<{
        user: User;
        token: string;
    }>;
    requestPasswordReset(email: string): Promise<void>;
    verifyOTP(email: string, otp: string): Promise<{
        resetToken: string;
    }>;
    resetPassword(resetToken: string, newPassword: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    requestEmailChange(userId: string, newEmail: string, password: string): Promise<User>;
    confirmEmailChange(userId: string, otp: string): Promise<{
        user: User;
        token: string;
    }>;
    resendEmailChangeOtp(userId: string): Promise<void>;
    private generateOTP;
}
export declare const authService: AuthService;
//# sourceMappingURL=AuthService.d.ts.map