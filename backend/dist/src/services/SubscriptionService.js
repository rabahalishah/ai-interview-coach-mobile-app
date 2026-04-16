"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = exports.SubscriptionError = exports.SubscriptionTier = void 0;
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["PAID"] = "paid";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
class SubscriptionError extends Error {
    constructor(message, code, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'SubscriptionError';
    }
}
exports.SubscriptionError = SubscriptionError;
class SubscriptionService {
    constructor(prisma) {
        this.prisma = prisma;
        this.FREE_TIER_LIMIT = 3;
    }
    async validateUsageLimit(userId) {
        try {
            const canCreateSession = await this.checkUsageLimit(userId);
            if (!canCreateSession) {
                const usageInfo = await this.getUsageInfo(userId);
                throw new SubscriptionError(`You have reached your monthly limit of ${usageInfo.limit} sessions. Please upgrade your subscription for unlimited access.`, 'USAGE_LIMIT_EXCEEDED', undefined);
            }
        }
        catch (error) {
            if (error instanceof SubscriptionError) {
                throw error;
            }
            throw new SubscriptionError('Failed to validate usage limit', 'USAGE_VALIDATION_FAILED', error);
        }
    }
    async checkUsageLimit(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                throw new SubscriptionError('User not found', 'USER_NOT_FOUND');
            }
            const tier = user.subscriptionTier.toLowerCase();
            if (tier === SubscriptionTier.PAID) {
                return true;
            }
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            const usage = await this.getCurrentMonthUsage(userId, currentMonth, currentYear);
            return usage.sessionCount < this.FREE_TIER_LIMIT;
        }
        catch (error) {
            if (error instanceof SubscriptionError) {
                throw error;
            }
            throw new SubscriptionError('Failed to check usage limit', 'USAGE_CHECK_FAILED', error);
        }
    }
    async incrementUsage(userId) {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            await this.prisma.usageTracking.upsert({
                where: {
                    userId_month_year: {
                        userId,
                        month: currentMonth,
                        year: currentYear
                    }
                },
                update: {
                    sessionCount: {
                        increment: 1
                    }
                },
                create: {
                    userId,
                    month: currentMonth,
                    year: currentYear,
                    sessionCount: 1
                }
            });
        }
        catch (error) {
            throw new SubscriptionError('Failed to increment usage', 'USAGE_INCREMENT_FAILED', error);
        }
    }
    async getUsageInfo(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                throw new SubscriptionError('User not found', 'USER_NOT_FOUND');
            }
            const tier = user.subscriptionTier.toLowerCase();
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            if (tier === SubscriptionTier.PAID) {
                return {
                    currentUsage: 0,
                    limit: null,
                    canCreateSession: true,
                    tier
                };
            }
            const usage = await this.getCurrentMonthUsage(userId, currentMonth, currentYear);
            return {
                currentUsage: usage.sessionCount,
                limit: this.FREE_TIER_LIMIT,
                canCreateSession: usage.sessionCount < this.FREE_TIER_LIMIT,
                tier
            };
        }
        catch (error) {
            if (error instanceof SubscriptionError) {
                throw error;
            }
            throw new SubscriptionError('Failed to get usage info', 'USAGE_INFO_FAILED', error);
        }
    }
    async upgradeSubscription(userId, tier) {
        try {
            const normalizedTier = tier.toLowerCase();
            await this.prisma.user.update({
                where: { id: userId },
                data: { subscriptionTier: normalizedTier }
            });
        }
        catch (error) {
            throw new SubscriptionError('Failed to upgrade subscription', 'SUBSCRIPTION_UPGRADE_FAILED', error);
        }
    }
    async resetMonthlyUsage() {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            await this.prisma.usageTracking.deleteMany({
                where: {
                    month: currentMonth,
                    year: currentYear
                }
            });
        }
        catch (error) {
            throw new SubscriptionError('Failed to reset monthly usage', 'USAGE_RESET_FAILED', error);
        }
    }
    async getCurrentMonthUsage(userId, month, year) {
        let usage = await this.prisma.usageTracking.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month,
                    year
                }
            }
        });
        if (!usage) {
            usage = await this.prisma.usageTracking.create({
                data: {
                    userId,
                    month,
                    year,
                    sessionCount: 0
                }
            });
        }
        return usage;
    }
}
exports.SubscriptionService = SubscriptionService;
//# sourceMappingURL=SubscriptionService.js.map