import type { InterviewConversationMessage, InterviewParticipants } from '../types/interviewConversation';
export declare function assertAnalysisTraitContract(a: {
    insights: string[];
    topTraits: string[];
    strengthAreas: string[];
    strengthInsights: string[];
    opportunityAreas: string[];
    opportunityInsights: string[];
    profileAiAttributes: Record<string, unknown>;
    messages: InterviewConversationMessage[];
}): void;
export declare function formatSessionAiAnalysisForClient(raw: unknown): unknown;
export declare function sanitizeAiAnalysisForPersistence(analysis: {
    analysisVersion: number;
    feedback: string;
    scores: {
        clarity: number;
        confidence: number;
        tone: number;
        enthusiasm: number;
        specificity: number;
    };
    insights: string[];
    topTraits: string[];
    strengthAreas: string[];
    strengthInsights: string[];
    opportunityAreas: string[];
    opportunityInsights: string[];
    participants?: InterviewParticipants;
    messages: InterviewConversationMessage[];
}): Record<string, unknown>;
//# sourceMappingURL=sessionAiAnalysis.d.ts.map