"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sessionAiAnalysis_1 = require("../../../src/utils/sessionAiAnalysis");
const interviewConversation_1 = require("../../../src/utils/interviewConversation");
const minimalAnalysis = () => ({
    analysisVersion: 2,
    feedback: 'Good job.',
    scores: { clarity: 4, confidence: 4, tone: 4, enthusiasm: 3, specificity: 3 },
    insights: ['Clear', 'Structured'],
    topTraits: ['Clear', 'Engaged'],
    strengthAreas: ['communication'],
    strengthInsights: ['You explained well.'],
    opportunityAreas: ['examples'],
    opportunityInsights: ['Add metrics.'],
    participants: (0, interviewConversation_1.buildDefaultParticipants)(),
    messages: [
        {
            id: 'm1',
            role: 'interviewer',
            speakerId: 'interviewer_1',
            text: 'Q?',
            edited: { isEdited: false, editedText: '' }
        },
        {
            id: 'm2',
            role: 'candidate',
            speakerId: 'candidate',
            text: 'A.',
            edited: { isEdited: false, editedText: '' },
            feedback: { flag: 'Good' }
        }
    ]
});
function traitContractArgs(overrides = {}) {
    const a = minimalAnalysis();
    return {
        insights: a.insights,
        topTraits: a.topTraits,
        strengthAreas: a.strengthAreas,
        strengthInsights: a.strengthInsights,
        opportunityAreas: a.opportunityAreas,
        opportunityInsights: a.opportunityInsights,
        profileAiAttributes: { communicationStyle: 'concise' },
        messages: a.messages,
        ...overrides
    };
}
describe('sessionAiAnalysis', () => {
    it('assertAnalysisTraitContract passes for valid analysis', () => {
        expect(() => (0, sessionAiAnalysis_1.assertAnalysisTraitContract)(traitContractArgs())).not.toThrow();
    });
    it('assertAnalysisTraitContract throws when topTraits too short', () => {
        expect(() => (0, sessionAiAnalysis_1.assertAnalysisTraitContract)(traitContractArgs({ topTraits: ['only one'] }))).toThrow(/topTraits/);
    });
    it('sanitizeAiAnalysisForPersistence omits candidate feedback on interviewer rows', () => {
        const raw = (0, sessionAiAnalysis_1.sanitizeAiAnalysisForPersistence)(minimalAnalysis());
        expect(raw.messages[0]).not.toHaveProperty('feedback');
        expect(raw.messages[1].feedback).toEqual({ flag: 'Good' });
        expect(raw).not.toHaveProperty('aiAttributes');
    });
    it('formatSessionAiAnalysisForClient hoists legacy conversation', () => {
        const formatted = (0, sessionAiAnalysis_1.formatSessionAiAnalysisForClient)({
            conversation: {
                participants: (0, interviewConversation_1.buildDefaultParticipants)(),
                messages: [
                    {
                        id: 'm1',
                        role: 'interviewer',
                        speakerId: 'interviewer_1',
                        text: 'Hi?',
                        edited: { isEdited: false, editedText: '' }
                    },
                    {
                        id: 'm2',
                        role: 'candidate',
                        speakerId: 'candidate',
                        text: 'Hello.',
                        edited: { isEdited: false, editedText: '' },
                        candidateFeedback: { flag: 'Good' }
                    }
                ],
                feedback: 'Legacy summary',
                scores: { clarity: 3, confidence: 3, tone: 3, enthusiasm: 3, specificity: 3 },
                insights: ['a', 'b']
            }
        });
        expect(formatted.conversation).toBeUndefined();
        expect(formatted.feedback).toBe('Legacy summary');
        expect(Array.isArray(formatted.messages)).toBe(true);
        expect(formatted.aiAttributes).toBeUndefined();
    });
});
//# sourceMappingURL=sessionAiAnalysis.test.js.map