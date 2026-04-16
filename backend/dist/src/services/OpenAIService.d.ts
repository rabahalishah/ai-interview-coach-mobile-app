import { UserProfile } from '@prisma/client';
import type { InterviewConversationMessage, InterviewParticipants } from '../types/interviewConversation';
export declare const ANALYSIS_DESIRED_MAX_COMPLETION = 8000;
export declare const RESUME_DESIRED_MAX_COMPLETION = 1500;
export declare function getContextLimitForModel(model: string, override?: number): number;
export declare function computeSafeMaxCompletionTokens(params: {
    model: string;
    systemText: string;
    userText: string;
    desiredMax: number;
    margin?: number;
    minFloor?: number;
    contextLimitOverride?: number;
}): number;
export declare const INTERVIEW_ANALYSIS_SYSTEM_PROMPT = "You are an AI interview analyzer.\n\nYou will receive a raw transcript of a real interview conversation generated from speech-to-text (Whisper). The transcript may contain multiple speakers and may not clearly label who is speaking.\n\nYour task is to:\n\n----------------------------------------\nSTEP 1: IDENTIFY ROLES\n----------------------------------------\n- Detect all speakers in the conversation.\n- Classify each speaker into one of the following roles:\n  - \"candidate\"\n  - \"interviewer\"\n  - \"other\"\n  - \"unknown\"\n\nRules:\n- The \"candidate\" is the person answering most questions.\n- \"Interviewers\" are the ones asking questions.\n- There can be multiple interviewers.\n- If unsure, use \"unknown\".\n\n----------------------------------------\nSTEP 2: STRUCTURE THE CONVERSATION\n----------------------------------------\n- Break the transcript into ordered messages.\n- Each message must:\n  - Have a unique id (string)\n  - Include speakerId (consistent per speaker)\n  - Include detected role\n  - Contain the exact spoken text (cleaned but not re-written)\n- DO NOT summarize messages.\n\n----------------------------------------\nSTEP 3: DETECT QUESTIONS & ANSWERS\n----------------------------------------\n- Identify interviewer questions and corresponding candidate answers.\n- Use this understanding to drive analysis (DO NOT output Q/A separately).\n- Maintain flow in messages array.\n\n----------------------------------------\nSTEP 4: ANALYZE CANDIDATE\n----------------------------------------\nGenerate:\n\n1. feedback:\n   - A concise but insightful paragraph summarizing performance.\n\n2. scores (integers 1\u20135 for each dimension):\n   - clarity\n   - confidence\n   - tone\n   - enthusiasm\n   - specificity\n\n3. insights:\n   - At least 1 key observation.\n\n4. topTraits:\n   - At least 2 traits describing the candidate.\n\n5. strengthAreas & strengthInsights:\n   - Strengths + explanations.\n\n6. opportunityAreas & opportunityInsights:\n   - Areas to improve + explanations.\n\n7. aiAttributes:\n   - A non-empty object with useful structured attributes such as:\n     - communicationStyle\n     - seniorityEstimate\n     - domainKnowledge\n     - etc.\n\n----------------------------------------\nSTEP 5: MESSAGE-LEVEL FEEDBACK\n----------------------------------------\n- For messages where role = \"candidate\":\n  assign:\n    feedback.flag = \"Good\" | \"Improvement\" | \"Neutral\"\n\nGuidelines:\n- Good \u2192 strong, clear, relevant answers\n- Improvement \u2192 vague, incorrect, weak answers\n- Neutral \u2192 filler or unclear\n\n----------------------------------------\nSTEP 6: PARTICIPANTS OBJECT\n----------------------------------------\n- Create:\n  participants.candidate \u2192 single candidate\n  participants.interviewers \u2192 array of interviewers\n\nEach must have:\n  - id (same as used in messages)\n  - optional displayName (if inferable, otherwise omit)\n\n----------------------------------------\nOUTPUT RULES (CRITICAL)\n----------------------------------------\n- Output ONLY valid JSON\n- NO explanations\n- NO markdown\n- NO extra text\n- STRICTLY follow the interface below\n- All required fields MUST be present\n- Arrays must respect minimum lengths\n- Scores must be integers from 1 through 5\n- Ensure aiAttributes is NOT empty\n- Ensure insights, traits, strengths, opportunities are NOT empty\n\n----------------------------------------\nINTERFACE TO FOLLOW EXACTLY\n----------------------------------------\n\ntype CandidateMessageFlag = 'Good' | 'Improvement' | 'Neutral';\ntype SpeakerRole = 'interviewer' | 'candidate' | 'other' | 'unknown';\n\ninterface SessionAiAnalysis {\n  analysisVersion: 2;\n\n  feedback: string;\n  scores: {\n    clarity: number;\n    confidence: number;\n    tone: number;\n    enthusiasm: number;\n    specificity: number;\n  };\n  insights: [string, ...string[]];\n\n  topTraits: [string, string, ...string[]];\n  strengthAreas: [string, ...string[]];\n  strengthInsights: [string, ...string[]];\n  opportunityAreas: [string, ...string[]];\n  opportunityInsights: [string, ...string[]];\n  aiAttributes: Record<string, unknown> & { [k: string]: unknown };\n\n  participants: {\n    candidate: { id: string; displayName?: string };\n    interviewers: Array<{ id: string; displayName?: string }>;\n  };\n\n  messages: Array<{\n    id: string;\n    role: SpeakerRole;\n    speakerId: string;\n    text: string;\n    edited: { isEdited: boolean; editedText?: string };\n    feedback?: { flag: CandidateMessageFlag };\n  }>;\n}\n\n----------------------------------------\nINPUT TRANSCRIPT:\n----------------------------------------\n{{TRANSCRIPT}}";
export interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
}
export interface AIAnalysis {
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
    participants: InterviewParticipants;
    messages: InterviewConversationMessage[];
}
export interface SessionAnalysisResult {
    analysis: AIAnalysis;
    profileAiAttributes: Record<string, any>;
}
export interface AnalyzeResponseOptions {
    sessionId?: string;
}
export interface UserContext {
    profile: UserProfile;
    targetRole?: {
        industry: string;
        jobTitle: string;
    };
    pastSessionsSummary?: string;
}
export interface ResumeData {
    skills: string[];
    experienceLevel: string;
    industries: string[];
    jobTitles: string[];
    summary: string;
    fullName?: string;
    currentJobTitle?: string;
    currentCompany?: string;
    school?: string;
    degreeInfo?: string;
    previousJobTitles?: string[];
}
export interface OpenAIConfig {
    gptApiKey: string;
    whisperApiKey: string;
    maxRetries: number;
    timeout: number;
    whisperTimeoutMs: number;
    gptModel: string;
    contextTokenLimit?: number;
    analysisTierSMaxInputTokens: number;
    analysisPromptVersion: string;
    enableLongTranscriptPipeline: boolean;
}
export declare const loadOpenAIConfig: () => OpenAIConfig;
export declare const validateOpenAIConfig: (config: OpenAIConfig) => void;
export declare class OpenAIServiceError extends Error {
    readonly originalError?: Error | undefined;
    readonly retryable: boolean;
    constructor(message: string, originalError?: Error | undefined, retryable?: boolean);
}
export declare class OpenAIService {
    private gptClient;
    private whisperClient;
    private config;
    constructor(config?: Partial<OpenAIConfig>);
    private validateAudioBuffer;
    private validateTextInput;
    transcribeAudio(audioBuffer: Buffer, filename?: string): Promise<TranscriptionResult>;
    analyzeResponse(transcript: string, userContext: UserContext, options?: AnalyzeResponseOptions): Promise<SessionAnalysisResult>;
    extractResumeData(resumeText: string): Promise<ResumeData>;
    private logChatCompletionUsage;
    private repairAnalysisJson;
    private analyzeConversationSinglePass;
    private static readonly MAP_SEGMENT_TOKEN_BUDGET;
    private static readonly MAX_MAP_SEGMENTS;
    private static readonly MAP_SEGMENT_SYSTEM;
    private splitTranscriptForMapReduce;
    private mapTranscriptSegment;
    private buildReduceSystemPrompt;
    private analyzeConversationMapReduce;
    generatePersonalizedPrompt(userProfile: UserProfile): string;
    private generateConversationAnalysisPrompt;
    private extractJson;
    private generateResumeExtractionPrompt;
    private parseAnalysisResponse;
    private parseResumeData;
    private generateFallbackAnalysis;
    private generateFallbackResumeData;
}
//# sourceMappingURL=OpenAIService.d.ts.map