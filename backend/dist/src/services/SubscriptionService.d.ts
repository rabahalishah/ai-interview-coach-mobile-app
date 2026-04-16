import { PrismaClient } from '@prisma/client';
export declare enum SubscriptionTier {
    FREE = "free",
    PAID = "paid"
}
export interface UsageInfo {
    currentUsage: number;
    limit: number | null;
    canCreateSession: boolean;
    tier: SubscriptionTier;
}
export declare class SubscriptionError extends Error {
    readonly code: string;
    readonly originalError?: Error | undefined;
    constructor(message: string, code: string, originalError?: Error | undefined);
}
export declare class SubscriptionService {
    private prisma;
    private readonly FREE_TIER_LIMIT;
    constructor(prisma: PrismaClient);
    validateUsageLimit(userId: string): Promise<void>;
    checkUsageLimit(userId: string): Promise<boolean>;
    incrementUsage(userId: string): Promise<void>;
    getUsageInfo(userId: string): Promise<UsageInfo>;
    upgradeSubscription(userId: string, tier: SubscriptionTier): Promise<void>;
    resetMonthlyUsage(): Promise<void>;
    private getCurrentMonthUsage;
}
//# sourceMappingURL=SubscriptionService.d.ts.map