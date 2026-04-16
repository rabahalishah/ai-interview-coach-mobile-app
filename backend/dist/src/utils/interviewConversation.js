"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveMessageText = getEffectiveMessageText;
exports.buildDefaultParticipants = buildDefaultParticipants;
exports.roleToCanonicalLabel = roleToCanonicalLabel;
exports.serializeConversationToCanonicalTranscript = serializeConversationToCanonicalTranscript;
exports.normalizeMessagesForLLM = normalizeMessagesForLLM;
exports.serializeConversationToParagraph = serializeConversationToParagraph;
function safeTextForSerialization(text) {
    return String(text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+\n/g, '\n')
        .trim();
}
function getEffectiveMessageText(msg) {
    if (msg.edited?.isEdited && typeof msg.edited.editedText === 'string') {
        return safeTextForSerialization(msg.edited.editedText);
    }
    return safeTextForSerialization(msg.text);
}
function buildDefaultParticipants() {
    return {
        candidate: { id: 'candidate' },
        interviewers: [{ id: 'interviewer_1' }]
    };
}
function roleToCanonicalLabel(role, speakerId, participants) {
    if (role === 'candidate')
        return 'Candidate';
    if (role === 'interviewer') {
        if (participants?.interviewers?.length) {
            const idx = participants.interviewers.findIndex(i => i.id === speakerId);
            if (idx >= 0)
                return `Interviewer_${idx + 1}`;
        }
        return 'Interviewer';
    }
    if (role === 'other')
        return 'Other';
    return 'Unknown';
}
function serializeConversationToCanonicalTranscript(messages, participants) {
    const lines = [];
    let turn = 1;
    for (const msg of messages) {
        const text = getEffectiveMessageText(msg);
        if (!text)
            continue;
        const label = roleToCanonicalLabel(msg.role, msg.speakerId, participants);
        lines.push(`Turn ${turn} ${label}: ${text}`);
        turn += 1;
    }
    return lines.join('\n');
}
function normalizeMessagesForLLM(messages) {
    return messages
        .map(m => ({
        id: String(m.id),
        role: m.role,
        speakerId: String(m.speakerId ?? ''),
        text: getEffectiveMessageText(m)
    }))
        .filter(m => m.text.length > 0);
}
function serializeConversationToParagraph(messages, participants) {
    const parts = [];
    for (const msg of messages) {
        const text = getEffectiveMessageText(msg);
        if (!text)
            continue;
        const label = roleToCanonicalLabel(msg.role, msg.speakerId, participants);
        parts.push(`${label}: ${text}`);
    }
    return parts.join('\n\n');
}
//# sourceMappingURL=interviewConversation.js.map