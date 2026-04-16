import type { InterviewConversationMessage, InterviewParticipants, InterviewSpeakerRole } from '../types/interviewConversation';
export declare function getEffectiveMessageText(msg: InterviewConversationMessage): string;
export declare function buildDefaultParticipants(): InterviewParticipants;
export declare function roleToCanonicalLabel(role: InterviewSpeakerRole, speakerId: string, participants?: InterviewParticipants): string;
export declare function serializeConversationToCanonicalTranscript(messages: InterviewConversationMessage[], participants?: InterviewParticipants): string;
export declare function normalizeMessagesForLLM(messages: InterviewConversationMessage[]): Array<{
    id: string;
    role: InterviewSpeakerRole;
    speakerId: string;
    text: string;
}>;
export declare function serializeConversationToParagraph(messages: InterviewConversationMessage[], participants?: InterviewParticipants): string;
//# sourceMappingURL=interviewConversation.d.ts.map