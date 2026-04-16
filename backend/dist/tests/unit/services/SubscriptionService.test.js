"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SubscriptionService_1 = require("../../../src/services/SubscriptionService");
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        update: jest.fn()
    },
    usageTracking: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn()
    }
};
describe('SubscriptionService', () => {
    let subscriptionService;
    beforeEach(() => {
        subscriptionService = new SubscriptionService_1.SubscriptionService(mockPrisma);
        jest.clearAllMocks();
    });
    describe('validateUsageLimit', () => {
        it('should not throw for paid users', async () => {
            const userId = 'user-1';
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.PAID
            });
            await expect(subscriptionService.validateUsageLimit(userId))
                .resolves.not.toThrow();
        });
        it('should not throw for free users under limit', async () => {
            const userId = 'user-1';
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.FREE
            });
            mockPrisma.usageTracking.findUnique = jest.fn().mockResolvedValue({
                userId,
                month: currentMonth,
                year: currentYear,
                sessionCount: 2
            });
            await expect(subscriptionService.validateUsageLimit(userId))
                .resolves.not.toThrow();
        });
        it('should throw USAGE_LIMIT_EXCEEDED for free users at limit', async () => {
            const userId = 'user-1';
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.FREE
            });
            mockPrisma.usageTracking.findUnique = jest.fn().mockResolvedValue({
                userId,
                month: currentMonth,
                year: currentYear,
                sessionCount: 3
            });
            await expect(subscriptionService.validateUsageLimit(userId))
                .rejects.toThrow(SubscriptionService_1.SubscriptionError);
            try {
                await subscriptionService.validateUsageLimit(userId);
            }
            catch (error) {
                expect(error).toBeInstanceOf(SubscriptionService_1.SubscriptionError);
                expect(error.code).toBe('USAGE_LIMIT_EXCEEDED');
                expect(error.message).toContain('monthly limit of 3 sessions');
            }
        });
        it('should throw error for non-existent user', async () => {
            const userId = 'non-existent';
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);
            await expect(subscriptionService.validateUsageLimit(userId))
                .rejects.toThrow(SubscriptionService_1.SubscriptionError);
        });
    });
    describe('checkUsageLimit', () => {
        it('should return true for paid users regardless of usage', async () => {
            const userId = 'user-1';
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.PAID
            });
            const result = await subscriptionService.checkUsageLimit(userId);
            expect(result).toBe(true);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: userId }
            });
        });
        it('should return true for free users under limit', async () => {
            const userId = 'user-1';
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.FREE
            });
            mockPrisma.usageTracking.findUnique = jest.fn().mockResolvedValue({
                userId,
                month: currentMonth,
                year: currentYear,
                sessionCount: 2
            });
            const result = await subscriptionService.checkUsageLimit(userId);
            expect(result).toBe(true);
        });
        it('should return false for free users at limit', async () => {
            const userId = 'user-1';
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.FREE
            });
            mockPrisma.usageTracking.findUnique = jest.fn().mockResolvedValue({
                userId,
                month: currentMonth,
                year: currentYear,
                sessionCount: 3
            });
            const result = await subscriptionService.checkUsageLimit(userId);
            expect(result).toBe(false);
        });
        it('should throw error for non-existent user', async () => {
            const userId = 'non-existent';
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);
            await expect(subscriptionService.checkUsageLimit(userId))
                .rejects.toThrow(SubscriptionService_1.SubscriptionError);
        });
    });
    describe('incrementUsage', () => {
        it('should increment usage for existing record', async () => {
            const userId = 'user-1';
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            mockPrisma.usageTracking.upsert = jest.fn().mockResolvedValue({
                userId,
                month: currentMonth,
                year: currentYear,
                sessionCount: 2
            });
            await subscriptionService.incrementUsage(userId);
            expect(mockPrisma.usageTracking.upsert).toHaveBeenCalledWith({
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
        });
        it('should handle database errors', async () => {
            const userId = 'user-1';
            mockPrisma.usageTracking.upsert = jest.fn().mockRejectedValue(new Error('Database error'));
            await expect(subscriptionService.incrementUsage(userId))
                .rejects.toThrow(SubscriptionService_1.SubscriptionError);
        });
    });
    describe('getUsageInfo', () => {
        it('should return unlimited usage for paid users', async () => {
            const userId = 'user-1';
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.PAID
            });
            const result = await subscriptionService.getUsageInfo(userId);
            expect(result).toEqual({
                currentUsage: 0,
                limit: null,
                canCreateSession: true,
                tier: SubscriptionService_1.SubscriptionTier.PAID
            });
        });
        it('should return current usage for free users', async () => {
            const userId = 'user-1';
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: SubscriptionService_1.SubscriptionTier.FREE
            });
            mockPrisma.usageTracking.findUnique = jest.fn().mockResolvedValue({
                userId,
                month: currentMonth,
                year: currentYear,
                sessionCount: 2
            });
            const result = await subscriptionService.getUsageInfo(userId);
            expect(result).toEqual({
                currentUsage: 2,
                limit: 3,
                canCreateSession: true,
                tier: SubscriptionService_1.SubscriptionTier.FREE
            });
        });
    });
    describe('upgradeSubscription', () => {
        it('should upgrade user subscription tier', async () => {
            const userId = 'user-1';
            const tier = SubscriptionService_1.SubscriptionTier.PAID;
            mockPrisma.user.update = jest.fn().mockResolvedValue({
                id: userId,
                subscriptionTier: tier
            });
            await subscriptionService.upgradeSubscription(userId, tier);
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: { subscriptionTier: tier }
            });
        });
        it('should handle database errors during upgrade', async () => {
            const userId = 'user-1';
            const tier = SubscriptionService_1.SubscriptionTier.PAID;
            mockPrisma.user.update = jest.fn().mockRejectedValue(new Error('Database error'));
            await expect(subscriptionService.upgradeSubscription(userId, tier))
                .rejects.toThrow(SubscriptionService_1.SubscriptionError);
        });
    });
    describe('resetMonthlyUsage', () => {
        it('should delete all usage records for current month', async () => {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            mockPrisma.usageTracking.deleteMany = jest.fn().mockResolvedValue({ count: 5 });
            await subscriptionService.resetMonthlyUsage();
            expect(mockPrisma.usageTracking.deleteMany).toHaveBeenCalledWith({
                where: {
                    month: currentMonth,
                    year: currentYear
                }
            });
        });
        it('should handle database errors during reset', async () => {
            mockPrisma.usageTracking.deleteMany = jest.fn().mockRejectedValue(new Error('Database error'));
            await expect(subscriptionService.resetMonthlyUsage())
                .rejects.toThrow(SubscriptionService_1.SubscriptionError);
        });
    });
});
//# sourceMappingURL=SubscriptionService.test.js.map