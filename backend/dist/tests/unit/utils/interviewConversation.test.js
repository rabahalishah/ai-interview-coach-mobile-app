"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interviewConversation_1 = require("../../../src/utils/interviewConversation");
describe('interviewConversation serialization', () => {
    it('should deterministically serialize messages with turn numbers', () => {
        const participants = (0, interviewConversation_1.buildDefaultParticipants)();
        const messages = [
            {
                id: 'm1',
                role: 'interviewer',
                speakerId: 'interviewer_1',
                text: 'Tell me about yourself.',
                edited: { isEdited: false }
            },
            {
                id: 'm2',
                role: 'candidate',
                speakerId: 'candidate',
                text: 'I am a backend engineer.',
                edited: { isEdited: false }
            }
        ];
        const canonical = (0, interviewConversation_1.serializeConversationToCanonicalTranscript)(messages, participants);
        expect(canonical).toBe('Turn 1 Interviewer_1: Tell me about yourself.\n' +
            'Turn 2 Candidate: I am a backend engineer.');
    });
    it('should use editedText when isEdited=true', () => {
        const participants = (0, interviewConversation_1.buildDefaultParticipants)();
        const messages = [
            {
                id: 'm1',
                role: 'candidate',
                speakerId: 'candidate',
                text: 'original',
                edited: { isEdited: true, editedText: 'updated answer' }
            }
        ];
        const paragraph = (0, interviewConversation_1.serializeConversationToParagraph)(messages, participants);
        expect(paragraph).toBe('Candidate: updated answer');
    });
});
//# sourceMappingURL=interviewConversation.test.js.map