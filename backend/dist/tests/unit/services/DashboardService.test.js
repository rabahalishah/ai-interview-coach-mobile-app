"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DashboardService_1 = require("../../../src/services/DashboardService");
const mockPrisma = {
    user: {
        findUnique: jest.fn()
    },
    audioSession: {
        findMany: jest.fn()
    },
    usageTracking: {
        findUnique: jest.fn()
    }
};
describe('DashboardService Unit Tests', () => {
    let dashboardService;
    beforeEach(() => {
        dashboardService = new DashboardService_1.DashboardService(mockPrisma);
        jest.clearAllMocks();
    });
    describe('calculateConfidenceScore', () => {
        it('should return 0 for user with no sessions', async () => {
            mockPrisma.audioSession.findMany.mockResolvedValue([]);
            const result = await dashboardService.calculateConfidenceScore('user-id');
            expect(result).toBe(0);
        });
        it('should calculate confidence score from session data', async () => {
            const mockSessions = [
                {
                    id: '1',
                    clarityScore: 4,
                    confidenceScore: 4,
                    toneScore: 4,
                    enthusiasmScore: 5,
                    specificityScore: 4,
                    createdAt: new Date()
                },
                {
                    id: '2',
                    clarityScore: 4,
                    confidenceScore: 4,
                    toneScore: 4,
                    enthusiasmScore: 4,
                    specificityScore: 4,
                    createdAt: new Date()
                }
            ];
            mockPrisma.audioSession.findMany.mockResolvedValue(mockSessions);
            const result = await dashboardService.calculateConfidenceScore('user-id');
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(5);
        });
        it('should handle database errors gracefully', async () => {
            mockPrisma.audioSession.findMany.mockRejectedValue(new Error('Database error'));
            await expect(dashboardService.calculateConfidenceScore('user-id'))
                .rejects
                .toThrow(DashboardService_1.DashboardError);
        });
    });
    describe('getStats', () => {
        it('should throw error for non-existent user', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(dashboardService.getStats('non-existent-user'))
                .rejects
                .toThrow(DashboardService_1.DashboardError);
        });
        it('should return dashboard stats for valid user', async () => {
            const mockUser = {
                id: 'user-id',
                subscriptionTier: 'free',
                usageTracking: []
            };
            const mockSessions = [
                {
                    id: '1',
                    clarityScore: 80,
                    confidenceScore: 85,
                    toneScore: 75,
                    enthusiasmScore: 90,
                    specificityScore: 70,
                    status: 'completed',
                    createdAt: new Date()
                }
            ];
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.audioSession.findMany.mockResolvedValue(mockSessions);
            mockPrisma.usageTracking.findUnique.mockResolvedValue(null);
            const result = await dashboardService.getStats('user-id');
            expect(result).toHaveProperty('confidenceScore');
            expect(result).toHaveProperty('totalSessions');
            expect(result).toHaveProperty('averageScores');
            expect(result).toHaveProperty('recentInsights');
            expect(result).toHaveProperty('usageThisMonth');
            expect(result).toHaveProperty('usageLimit');
            expect(result.totalSessions).toBe(1);
            expect(result.usageLimit).toBe(3);
            expect(Array.isArray(result.recentInsights)).toBe(true);
        });
    });
    describe('getRecentInsights', () => {
        it('should return empty array for user with no sessions', async () => {
            mockPrisma.audioSession.findMany.mockResolvedValue([]);
            const result = await dashboardService.getRecentInsights('user-id');
            expect(result).toEqual([]);
        });
        it('should generate insights from session data', async () => {
            const mockSessions = [
                {
                    id: '1',
                    clarityScore: 80,
                    confidenceScore: 85,
                    toneScore: 75,
                    enthusiasmScore: 90,
                    specificityScore: 70,
                    status: 'completed',
                    createdAt: new Date()
                }
            ];
            mockPrisma.audioSession.findMany.mockResolvedValue(mockSessions);
            const result = await dashboardService.getRecentInsights('user-id', 5);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeLessThanOrEqual(5);
        });
    });
    describe('getPerformanceTrends', () => {
        it('should return empty array for user with no sessions', async () => {
            mockPrisma.audioSession.findMany.mockResolvedValue([]);
            const result = await dashboardService.getPerformanceTrends('user-id', 30);
            expect(result).toEqual([]);
        });
        it('should return performance trends for user with sessions', async () => {
            const mockSessions = [
                {
                    id: '1',
                    clarityScore: 80,
                    confidenceScore: 85,
                    toneScore: 75,
                    enthusiasmScore: 90,
                    specificityScore: 70,
                    status: 'completed',
                    createdAt: new Date()
                }
            ];
            mockPrisma.audioSession.findMany.mockResolvedValue(mockSessions);
            const result = await dashboardService.getPerformanceTrends('user-id', 30);
            expect(Array.isArray(result)).toBe(true);
            if (result.length > 0) {
                expect(result[0]).toHaveProperty('date');
                expect(result[0]).toHaveProperty('scores');
                expect(result[0]).toHaveProperty('sessionCount');
                expect(result[0].scores).toHaveProperty('clarity');
                expect(result[0].scores).toHaveProperty('confidence');
                expect(result[0].scores).toHaveProperty('tone');
                expect(result[0].scores).toHaveProperty('enthusiasm');
                expect(result[0].scores).toHaveProperty('specificity');
                expect(result[0].scores).toHaveProperty('overall');
            }
        });
    });
});
//# sourceMappingURL=DashboardService.test.js.map