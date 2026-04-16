"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscriptionRoutes = createSubscriptionRoutes;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const validation_1 = require("../middleware/validation");
const SubscriptionService_1 = require("../services/SubscriptionService");
function createSubscriptionRoutes(services) {
    const router = (0, express_1.Router)();
    const { subscriptionService } = services;
    router.use(auth_1.authenticate);
    router.use(auth_1.requireEmailVerified);
    router.use((0, security_1.enforceDataIsolation)('usage'));
    router.get('/info', async (req, res) => {
        try {
            const userId = req.user.id;
            const usageInfo = await subscriptionService.getUsageInfo(userId);
            res.status(200).json({
                success: true,
                data: {
                    tier: usageInfo.tier,
                    currentUsage: usageInfo.currentUsage,
                    limit: usageInfo.limit,
                    canCreateSession: usageInfo.canCreateSession
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof SubscriptionService_1.SubscriptionError) {
                const statusCode = error.code === 'USER_NOT_FOUND' ? 404 : 400;
                return res.status(statusCode).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Subscription info error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve subscription information'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    router.post('/upgrade', (0, validation_1.validateRequest)(validation_1.validationSchemas.subscription.upgrade), async (req, res) => {
        try {
            const userId = req.user.id;
            const { tier } = req.body;
            await subscriptionService.upgradeSubscription(userId, tier);
            res.status(200).json({
                success: true,
                message: `Subscription upgraded to ${tier} tier successfully`,
                data: {
                    tier
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof SubscriptionService_1.SubscriptionError) {
                const statusCode = error.code === 'USER_NOT_FOUND' ? 404 : 400;
                return res.status(statusCode).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Subscription upgrade error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to upgrade subscription'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    return router;
}
exports.default = createSubscriptionRoutes;
//# sourceMappingURL=subscription.js.map