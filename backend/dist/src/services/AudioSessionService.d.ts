import { PrismaClient, AudioSession } from '@prisma/client';
import { OpenAIService } from './OpenAIService';
import { S3Service } from './S3Service';
import { SubscriptionService } from './SubscriptionService';
import type { InterviewConversationMessage, InterviewParticipants } from '../types/interviewConversation';
export interface SessionCreationData {
    userId: string;
}
export interface AudioUploadData {
    sessionId: string;
    audioBuffer: Buffer;
    filename?: string;
}
export interface SessionWithAnalysis extends Omit<AudioSession, 'processingError'> {
    analysisComplete: boolean;
    processingError?: string | null;
}
export declare enum SessionStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    ANALYZING = "analyzing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class AudioSessionError extends Error {
    readonly code: string;
    readonly originalError?: Error | undefined;
    constructor(message: string, code: string, originalError?: Error | undefined);
}
export declare class AudioSessionService {
    private prisma;
    private openaiService;
    private s3Service;
    private subscriptionService;
    constructor(prisma: PrismaClient, openaiService: OpenAIService, s3Service: S3Service, subscriptionService: SubscriptionService);
    startSession(userId: string): Promise<AudioSession>;
    uploadAudio(sessionId: string, audioBuffer: Buffer, filename?: string): Promise<void>;
    private processAudioInMemory;
    processAudio(sessionId: string): Promise<void>;
    updateTranscriptAndReanalyze(sessionId: string, userId: string, input: string | {
        transcript?: string;
        conversation?: {
            participants?: InterviewParticipants;
            messages: InterviewConversationMessage[];
        };
    }): Promise<SessionWithAnalysis>;
    updateSessionDisplayName(sessionId: string, userId: string, displayName: string | null): Promise<AudioSession>;
    getSession(sessionId: string): Promise<SessionWithAnalysis | null>;
    getSessionHistory(userId: string, limit?: number, statusFilter?: string): Promise<AudioSession[]>;
    private calculatePerformanceScores;
    private updateSessionWithAnalysis;
    runAnalysisJob(sessionId: string): Promise<void>;
    private markSessionProcessingError;
    private getProfileForUserOrThrow;
    private getPastSessionsSummary;
    private updateUserAIAttributes;
    private processAudioAsync;
}
//# sourceMappingURL=AudioSessionService.d.ts.map