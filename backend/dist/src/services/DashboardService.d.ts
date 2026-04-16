import { PrismaClient } from '@prisma/client';
export interface DashboardStats {
    confidenceScore: number;
    totalSessions: number;
    averageScores: {
        clarity: number;
        confidence: number;
        tone: number;
        enthusiasm: number;
        specificity: number;
    };
    recentInsights: string[];
    usageThisMonth: number;
    usageLimit: number | null;
}
export interface Insight {
    id: string;
    type: 'improvement' | 'strength' | 'trend';
    message: string;
    category: 'clarity' | 'confidence' | 'tone' | 'enthusiasm' | 'specificity' | 'overall';
    createdAt: Date;
}
export interface PerformanceTrend {
    date: string;
    scores: {
        clarity: number;
        confidence: number;
        tone: number;
        enthusiasm: number;
        specificity: number;
        overall: number;
    };
    sessionCount: number;
}
export interface ScoreAnalysis {
    current: number;
    previous: number;
    change: number;
    trend: 'improving' | 'declining' | 'stable';
}
export declare class DashboardError extends Error {
    readonly code: string;
    readonly originalError?: Error | undefined;
    constructor(message: string, code: string, originalError?: Error | undefined);
}
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(userId: string): Promise<DashboardStats>;
    calculateConfidenceScore(userId: string): Promise<number>;
    getRecentInsights(userId: string, limit?: number): Promise<Insight[]>;
    getPerformanceTrends(userId: string, days?: number): Promise<PerformanceTrend[]>;
    private calculateAverageScores;
    private calculateSessionOverallScore;
    private calculateOverallScoreFromAverages;
    private generateRecentInsights;
    private analyzeTrends;
    private analyzeStrengthsAndWeaknesses;
    private analyzeImprovementPatterns;
    private getScoreByCategory;
    private calculateTrend;
}
//# sourceMappingURL=DashboardService.d.ts.map