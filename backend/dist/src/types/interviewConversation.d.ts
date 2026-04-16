export type InterviewSpeakerRole = 'interviewer' | 'candidate' | 'other' | 'unknown';
export type CandidateMessageFlag = 'Good' | 'Improvement' | 'Neutral';
export interface InterviewParticipants {
    candidate: {
        id: string;
        displayName?: string;
    };
    interviewers: Array<{
        id: string;
        displayName?: string;
    }>;
}
export interface CandidateAnswerFeedback {
    flag: CandidateMessageFlag;
}
export interface InterviewConversationMessage {
    id: string;
    role: InterviewSpeakerRole;
    speakerId: string;
    text: string;
    startMs?: number;
    endMs?: number;
    edited: {
        isEdited: boolean;
        editedText?: string;
    };
    feedback?: CandidateAnswerFeedback;
}
export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function normalizeCandidateFlag(value: unknown): CandidateMessageFlag | undefined;
//# sourceMappingURL=interviewConversation.d.ts.map