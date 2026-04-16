export declare enum SubscriptionTier {
    FREE = "free",
    PAID = "paid"
}
export declare enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    TOKEN_INVALID = "TOKEN_INVALID",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
    CONFLICT = "CONFLICT",
    NOT_FOUND = "NOT_FOUND",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
    PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND",
    USAGE_LIMIT_ERROR = "USAGE_LIMIT_ERROR",
    MONTHLY_LIMIT_EXCEEDED = "MONTHLY_LIMIT_EXCEEDED",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    OPENAI_API_ERROR = "OPENAI_API_ERROR",
    S3_UPLOAD_ERROR = "S3_UPLOAD_ERROR",
    TRANSCRIPTION_ERROR = "TRANSCRIPTION_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
}
export interface User {
    id: string;
    email: string;
    passwordHash: string | null;
    subscriptionTier: SubscriptionTier;
    emailVerified: boolean;
    pendingEmail: string | null;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthService {
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
}
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly details?: any;
    constructor(code: ErrorCode, message: string, statusCode?: number, details?: any);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string, details?: any);
}
export declare class EmailNotVerifiedError extends AppError {
    constructor(message?: string, details?: any);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, details?: any);
}
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
export declare class ExternalServiceError extends AppError {
    constructor(message?: string, details?: any);
}
export interface UserProfile {
    id: string;
    userId: string;
    fullName?: string;
    currentJobTitle?: string;
    currentCompany?: string;
    school?: string;
    degreeInfo?: string;
    previousJobTitles?: string[];
    resumeS3Key?: string;
    extractedSkills: string[];
    experienceLevel?: string;
    targetIndustry?: string;
    targetJobTitle?: string;
    aiAttributes: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProfileUpdateData {
    fullName?: string;
    currentJobTitle?: string;
    currentCompany?: string;
    school?: string;
    degreeInfo?: string;
    previousJobTitles?: string[];
    targetIndustry?: string;
    targetJobTitle?: string;
    experienceLevel?: string;
}
export interface DatabaseUserProfile {
    id: string;
    userId: string;
    fullName: string | null;
    currentJobTitle: string | null;
    currentCompany: string | null;
    school: string | null;
    degreeInfo: string | null;
    previousJobTitles: string[];
    resumeS3Key: string | null;
    extractedSkills: string[];
    experienceLevel: string | null;
    targetIndustry: string | null;
    targetJobTitle: string | null;
    aiAttributes: any;
    createdAt: Date;
    updatedAt: Date;
}
export interface UpdateProfileData {
    fullName?: string;
    currentJobTitle?: string;
    currentCompany?: string;
    school?: string;
    degreeInfo?: string;
    previousJobTitles?: string[];
    resumeS3Key?: string;
    targetIndustry?: string;
    targetJobTitle?: string;
    aiAttributes?: any;
    extractedSkills?: string[];
    experienceLevel?: string;
}
export interface ProfileService {
    getProfile(userId: string): Promise<UserProfile>;
    updateProfile(userId: string, data: ProfileUpdateData): Promise<UserProfile>;
    uploadResume(userId: string, file: Buffer, filename: string): Promise<string>;
    processResumeFromText(userId: string, extractedText: string): Promise<void>;
    processResume(userId: string, s3Key: string): Promise<void>;
    setTargetRole(userId: string, industry: string, jobTitle: string): Promise<void>;
    deleteProfile(userId: string): Promise<void>;
}
//# sourceMappingURL=auth.d.ts.map