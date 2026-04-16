import { Request, Response, NextFunction } from 'express';
interface User {
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
interface AuthenticatedRequest extends Request {
    user?: User;
}
declare enum SubscriptionTier {
    FREE = "free",
    PAID = "paid"
}
declare class AuthenticationError extends Error {
    details?: any | undefined;
    constructor(message: string, details?: any | undefined);
}
declare class AuthorizationError extends Error {
    details?: any | undefined;
    constructor(message: string, details?: any | undefined);
}
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireEmailVerified: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const optionalAuthenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireSubscription: (requiredTier: SubscriptionTier) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireOwnership: (resourceType: "session" | "profile") => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (maxAttempts?: number, windowMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const handleTokenRefresh: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const validateAccountStatus: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export { User, AuthenticatedRequest, SubscriptionTier, AuthenticationError, AuthorizationError };
//# sourceMappingURL=auth.d.ts.map