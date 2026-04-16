"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDashboardRoutes = createDashboardRoutes;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const validation_1 = require("../middleware/validation");
function createDashboardRoutes(services) {
    const router = (0, express_1.Router)();
    const { dashboardService } = services;
    router.get('/stats', auth_1.authenticate, auth_1.requireEmailVerified, (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const stats = await dashboardService.getStats(userId);
        res.status(200).json(stats);
    }));
    router.get('/insights', auth_1.authenticate, auth_1.requireEmailVerified, (0, validation_1.validateRequest)(validation_1.validationSchemas.dashboard.insights), (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const { limit } = req.query;
        const insights = await dashboardService.getRecentInsights(userId, limit);
        res.status(200).json({
            success: true,
            data: insights
        });
    }));
    router.get('/trends', auth_1.authenticate, auth_1.requireEmailVerified, (0, validation_1.validateRequest)(validation_1.validationSchemas.dashboard.trends), (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const { days } = req.query;
        const trends = await dashboardService.getPerformanceTrends(userId, days);
        res.status(200).json({
            success: true,
            data: trends
        });
    }));
    return router;
}
exports.default = createDashboardRoutes;
//# sourceMappingURL=dashboard.js.map