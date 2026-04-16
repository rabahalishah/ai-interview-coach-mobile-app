"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = exports.DashboardError = void 0;
class DashboardError extends Error {
    constructor(message, code, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'DashboardError';
    }
}
exports.DashboardError = DashboardError;
class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { usageTracking: true }
            });
            if (!user) {
                throw new DashboardError('User not found', 'USER_NOT_FOUND');
            }
            const sessions = await this.prisma.audioSession.findMany({
                where: {
                    userId,
                    status: 'completed'
                },
                orderBy: { createdAt: 'desc' }
            });
            const confidenceScore = await this.calculateConfidenceScore(userId);
            const averageScores = this.calculateAverageScores(sessions);
            const recentInsights = await this.generateRecentInsights(sessions.slice(0, 10));
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            const usageRecord = await this.prisma.usageTracking.findUnique({
                where: {
                    userId_month_year: {
                        userId,
                        month: currentMonth,
                        year: currentYear
                    }
                }
            });
            const usageThisMonth = usageRecord?.sessionCount || 0;
            const usageLimit = user.subscriptionTier === 'paid' ? null : 3;
            return {
                confidenceScore,
                totalSessions: sessions.length,
                averageScores,
                recentInsights,
                usageThisMonth,
                usageLimit
            };
        }
        catch (error) {
            if (error instanceof DashboardError) {
                throw error;
            }
            throw new DashboardError('Failed to get dashboard stats', 'STATS_RETRIEVAL_FAILED', error);
        }
    }
    async calculateConfidenceScore(userId) {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentSessions = await this.prisma.audioSession.findMany({
                where: {
                    userId,
                    status: 'completed',
                    createdAt: {
                        gte: thirtyDaysAgo
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            if (recentSessions.length === 0) {
                return 0;
            }
            let totalWeightedScore = 0;
            let totalWeight = 0;
            recentSessions.forEach((session, index) => {
                const sessionScore = this.calculateSessionOverallScore(session);
                const weight = 1.0 - (index * 0.5) / recentSessions.length;
                totalWeightedScore += sessionScore * weight;
                totalWeight += weight;
            });
            const confidenceScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
            if (totalWeight === 0)
                return 0;
            return Math.max(1, Math.min(5, Math.round(confidenceScore)));
        }
        catch (error) {
            throw new DashboardError('Failed to calculate confidence score', 'CONFIDENCE_CALCULATION_FAILED', error);
        }
    }
    async getRecentInsights(userId, limit = 10) {
        try {
            const sessions = await this.prisma.audioSession.findMany({
                where: {
                    userId,
                    status: 'completed'
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            });
            if (sessions.length === 0) {
                return [];
            }
            const insights = [];
            const trendInsights = this.analyzeTrends(sessions);
            insights.push(...trendInsights);
            const strengthInsights = this.analyzeStrengthsAndWeaknesses(sessions);
            insights.push(...strengthInsights);
            const improvementInsights = this.analyzeImprovementPatterns(sessions);
            insights.push(...improvementInsights);
            return insights
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, limit);
        }
        catch (error) {
            throw new DashboardError('Failed to get insights', 'INSIGHTS_RETRIEVAL_FAILED', error);
        }
    }
    async getPerformanceTrends(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const sessions = await this.prisma.audioSession.findMany({
                where: {
                    userId,
                    status: 'completed',
                    createdAt: {
                        gte: startDate
                    }
                },
                orderBy: { createdAt: 'asc' }
            });
            if (sessions.length === 0) {
                return [];
            }
            const dailyData = new Map();
            sessions.forEach(session => {
                const dateKey = session.createdAt.toISOString().split('T')[0];
                if (!dailyData.has(dateKey)) {
                    dailyData.set(dateKey, []);
                }
                dailyData.get(dateKey).push(session);
            });
            const trends = [];
            for (const [date, daySessions] of dailyData.entries()) {
                const averageScores = this.calculateAverageScores(daySessions);
                const overallScore = this.calculateOverallScoreFromAverages(averageScores);
                trends.push({
                    date,
                    scores: {
                        ...averageScores,
                        overall: overallScore
                    },
                    sessionCount: daySessions.length
                });
            }
            return trends.sort((a, b) => a.date.localeCompare(b.date));
        }
        catch (error) {
            throw new DashboardError('Failed to get performance trends', 'TRENDS_RETRIEVAL_FAILED', error);
        }
    }
    calculateAverageScores(sessions) {
        if (sessions.length === 0) {
            return {
                clarity: 0,
                confidence: 0,
                tone: 0,
                enthusiasm: 0,
                specificity: 0
            };
        }
        const totals = {
            clarity: 0,
            confidence: 0,
            tone: 0,
            enthusiasm: 0,
            specificity: 0
        };
        let validSessionCount = 0;
        sessions.forEach(session => {
            if (session.clarityScore !== null &&
                session.confidenceScore !== null &&
                session.toneScore !== null &&
                session.enthusiasmScore !== null &&
                session.specificityScore !== null) {
                totals.clarity += session.clarityScore;
                totals.confidence += session.confidenceScore;
                totals.tone += session.toneScore;
                totals.enthusiasm += session.enthusiasmScore;
                totals.specificity += session.specificityScore;
                validSessionCount++;
            }
        });
        if (validSessionCount === 0) {
            return {
                clarity: 0,
                confidence: 0,
                tone: 0,
                enthusiasm: 0,
                specificity: 0
            };
        }
        return {
            clarity: Math.round(totals.clarity / validSessionCount),
            confidence: Math.round(totals.confidence / validSessionCount),
            tone: Math.round(totals.tone / validSessionCount),
            enthusiasm: Math.round(totals.enthusiasm / validSessionCount),
            specificity: Math.round(totals.specificity / validSessionCount)
        };
    }
    calculateSessionOverallScore(session) {
        const scores = [
            session.clarityScore,
            session.confidenceScore,
            session.toneScore,
            session.enthusiasmScore,
            session.specificityScore
        ].filter(score => score !== null);
        if (scores.length === 0) {
            return 0;
        }
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
    calculateOverallScoreFromAverages(averages) {
        const scores = [
            averages.clarity,
            averages.confidence,
            averages.tone,
            averages.enthusiasm,
            averages.specificity
        ];
        return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    }
    async generateRecentInsights(sessions) {
        if (sessions.length === 0) {
            return ['Complete your first session to see personalized insights!'];
        }
        const insights = [];
        const recentAverage = this.calculateAverageScores(sessions.slice(0, 3));
        const overallAverage = this.calculateAverageScores(sessions);
        const categories = ['clarity', 'confidence', 'tone', 'enthusiasm', 'specificity'];
        const categoryScores = categories.map(cat => ({
            category: cat,
            score: recentAverage[cat]
        }));
        categoryScores.sort((a, b) => b.score - a.score);
        const strongest = categoryScores[0];
        const weakest = categoryScores[categoryScores.length - 1];
        if (strongest.score > 0) {
            insights.push(`Your ${strongest.category} is your strongest area with an average score of ${strongest.score}`);
        }
        if (weakest.score < 70 && sessions.length > 1) {
            insights.push(`Focus on improving your ${weakest.category} - current average is ${weakest.score}`);
        }
        if (sessions.length >= 3) {
            const recent3 = this.calculateOverallScoreFromAverages(this.calculateAverageScores(sessions.slice(0, 3)));
            const previous3 = this.calculateOverallScoreFromAverages(this.calculateAverageScores(sessions.slice(3, 6)));
            if (recent3 > previous3 + 5) {
                insights.push(`Great progress! Your recent sessions show a ${recent3 - previous3} point improvement`);
            }
            else if (recent3 < previous3 - 5) {
                insights.push(`Your recent performance has dipped. Consider reviewing your preparation strategy`);
            }
        }
        if (sessions.length >= 2) {
            const daysBetween = Math.abs((sessions[0].createdAt.getTime() - sessions[1].createdAt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysBetween > 7) {
                insights.push('Try to practice more regularly - consistent practice leads to better results');
            }
            else if (daysBetween <= 1) {
                insights.push('Great consistency! Regular practice is key to improvement');
            }
        }
        return insights.slice(0, 5);
    }
    analyzeTrends(sessions) {
        const insights = [];
        if (sessions.length < 3) {
            return insights;
        }
        const categories = ['clarity', 'confidence', 'tone', 'enthusiasm', 'specificity'];
        categories.forEach(category => {
            const scores = sessions
                .slice(0, 5)
                .map(s => this.getScoreByCategory(s, category))
                .filter(score => score !== null);
            if (scores.length >= 3) {
                const trend = this.calculateTrend(scores);
                if (trend.trend !== 'stable') {
                    insights.push({
                        id: `trend-${category}-${Date.now()}`,
                        type: 'trend',
                        message: `Your ${category} is ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change} points)`,
                        category,
                        createdAt: new Date()
                    });
                }
            }
        });
        return insights;
    }
    analyzeStrengthsAndWeaknesses(sessions) {
        const insights = [];
        const averages = this.calculateAverageScores(sessions.slice(0, 5));
        const categories = Object.entries(averages);
        categories.sort((a, b) => b[1] - a[1]);
        const strongest = categories[0];
        if (strongest[1] >= 80) {
            insights.push({
                id: `strength-${strongest[0]}-${Date.now()}`,
                type: 'strength',
                message: `Excellent ${strongest[0]} skills - you consistently score ${strongest[1]} in this area`,
                category: strongest[0],
                createdAt: new Date()
            });
        }
        const weakest = categories[categories.length - 1];
        if (weakest[1] < 60) {
            insights.push({
                id: `improvement-${weakest[0]}-${Date.now()}`,
                type: 'improvement',
                message: `Focus on ${weakest[0]} - this area needs attention (current average: ${weakest[1]})`,
                category: weakest[0],
                createdAt: new Date()
            });
        }
        return insights;
    }
    analyzeImprovementPatterns(sessions) {
        const insights = [];
        if (sessions.length < 4) {
            return insights;
        }
        const recent = this.calculateAverageScores(sessions.slice(0, 3));
        const older = this.calculateAverageScores(sessions.slice(3, 6));
        const recentOverall = this.calculateOverallScoreFromAverages(recent);
        const olderOverall = this.calculateOverallScoreFromAverages(older);
        const improvement = recentOverall - olderOverall;
        if (improvement >= 10) {
            insights.push({
                id: `improvement-overall-${Date.now()}`,
                type: 'improvement',
                message: `Outstanding progress! You've improved by ${improvement} points in recent sessions`,
                category: 'overall',
                createdAt: new Date()
            });
        }
        else if (improvement <= -10) {
            insights.push({
                id: `improvement-decline-${Date.now()}`,
                type: 'improvement',
                message: `Recent performance has declined by ${Math.abs(improvement)} points. Consider reviewing your approach`,
                category: 'overall',
                createdAt: new Date()
            });
        }
        return insights;
    }
    getScoreByCategory(session, category) {
        switch (category) {
            case 'clarity': return session.clarityScore;
            case 'confidence': return session.confidenceScore;
            case 'tone': return session.toneScore;
            case 'enthusiasm': return session.enthusiasmScore;
            case 'specificity': return session.specificityScore;
            default: return null;
        }
    }
    calculateTrend(scores) {
        if (scores.length < 2) {
            return { current: scores[0] || 0, previous: 0, change: 0, trend: 'stable' };
        }
        const current = scores[0];
        const previous = scores[scores.length - 1];
        const change = current - previous;
        let trend;
        if (change >= 5) {
            trend = 'improving';
        }
        else if (change <= -5) {
            trend = 'declining';
        }
        else {
            trend = 'stable';
        }
        return { current, previous, change, trend };
    }
}
exports.DashboardService = DashboardService;
//# sourceMappingURL=DashboardService.js.map