"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAnalysisTraitContract = assertAnalysisTraitContract;
exports.formatSessionAiAnalysisForClient = formatSessionAiAnalysisForClient;
exports.sanitizeAiAnalysisForPersistence = sanitizeAiAnalysisForPersistence;
const interviewConversation_1 = require("../types/interviewConversation");
const interviewConversation_2 = require("./interviewConversation");
const CURRENT_ANALYSIS_VERSION = 2;
function trimNonEmptyStrings(arr) {
    if (!Array.isArray(arr))
        return [];
    return arr.map((item) => String(item).trim()).filter(s => s.length > 0);
}
function assertAnalysisTraitContract(a) {
    if (a.insights.length < 1)
        throw new Error('insights must have at least one non-empty item');
    if (a.topTraits.length < 2)
        throw new Error('topTraits must have at least two non-empty items');
    if (a.strengthAreas.length < 1)
        throw new Error('strengthAreas must have at least one non-empty item');
    if (a.strengthInsights.length < 1)
        throw new Error('strengthInsights must have at least one non-empty item');
    if (a.opportunityAreas.length < 1)
        throw new Error('opportunityAreas must have at least one non-empty item');
    if (a.opportunityInsights.length < 1)
        throw new Error('opportunityInsights must have at least one non-empty item');
    if (Object.keys(a.profileAiAttributes).length < 1) {
        throw new Error('profileAiAttributes must have at least one key with a non-empty value');
    }
    if (!Array.isArray(a.messages) || a.messages.length < 1)
        throw new Error('messages must be a non-empty array');
}
function normalizeMessageForApi(m) {
    if (!(0, interviewConversation_1.isObject)(m))
        return null;
    const role = m.role;
    const id = String(m.id ?? '').trim();
    const speakerId = String(m.speakerId ?? '').trim();
    const text = String(m.text ?? '').trim();
    if (!id || !text)
        return null;
    const editedRaw = m.edited;
    const edited = editedRaw && typeof editedRaw === 'object' && !Array.isArray(editedRaw)
        ? {
            isEdited: Boolean(editedRaw.isEdited),
            editedText: typeof editedRaw.editedText === 'string' ? editedRaw.editedText : ''
        }
        : { isEdited: false, editedText: '' };
    const flag = (0, interviewConversation_1.normalizeCandidateFlag)(m.feedback?.flag) ??
        (0, interviewConversation_1.normalizeCandidateFlag)(m.candidateFeedback?.flag);
    const base = {
        id,
        role: ['interviewer', 'candidate', 'other', 'unknown'].includes(String(role)) ? role : 'unknown',
        speakerId: speakerId || 'unknown',
        text,
        edited,
        ...(typeof m.startMs === 'number' ? { startMs: m.startMs } : {}),
        ...(typeof m.endMs === 'number' ? { endMs: m.endMs } : {})
    };
    if (base.role === 'candidate' && flag) {
        base.feedback = { flag };
    }
    return base;
}
function backfillTraitsFromLegacy(raw, feedback, insights) {
    const topTraits = trimNonEmptyStrings(raw.topTraits);
    const strengthAreas = trimNonEmptyStrings(raw.strengthAreas);
    const strengthInsights = trimNonEmptyStrings(raw.strengthInsights);
    const opportunityAreas = trimNonEmptyStrings(raw.opportunityAreas);
    const opportunityInsights = trimNonEmptyStrings(raw.opportunityInsights);
    if (topTraits.length < 2 && insights.length > 0) {
        const extra = insights.filter(Boolean).slice(0, 3 - topTraits.length);
        while (topTraits.length < 2 && extra.length) {
            topTraits.push(extra.shift());
        }
    }
    if (topTraits.length < 2 && feedback.trim()) {
        const sentence = feedback.split(/[.!?]\s+/).map(s => s.trim()).filter(Boolean)[0];
        if (sentence && !topTraits.includes(sentence))
            topTraits.push(sentence.slice(0, 200));
        if (topTraits.length < 2 && feedback.trim())
            topTraits.push('Demonstrated engagement in the conversation');
    }
    if (strengthAreas.length < 1)
        strengthAreas.push('overall performance');
    if (strengthInsights.length < 1)
        strengthInsights.push(feedback.trim().slice(0, 300) || 'Positive aspects noted in summary feedback');
    if (opportunityAreas.length < 1)
        opportunityAreas.push('continued growth');
    if (opportunityInsights.length < 1) {
        opportunityInsights.push(insights.find(i => i.trim().length > 0) || 'Continue refining structure and specificity in answers');
    }
    return {
        topTraits: topTraits.slice(0, 10),
        strengthAreas,
        strengthInsights,
        opportunityAreas,
        opportunityInsights
    };
}
function formatSessionAiAnalysisForClient(raw) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
        return raw;
    let obj = { ...raw };
    const conv = obj.conversation;
    if (conv && typeof conv === 'object' && !Array.isArray(conv)) {
        const c = conv;
        if (!obj.feedback && typeof c.feedback === 'string')
            obj.feedback = c.feedback;
        if (!obj.scores && (0, interviewConversation_1.isObject)(c.scores))
            obj.scores = c.scores;
        if (!obj.insights && Array.isArray(c.insights))
            obj.insights = c.insights;
        if (!obj.participants && (0, interviewConversation_1.isObject)(c.participants))
            obj.participants = c.participants;
        if (!obj.messages && Array.isArray(c.messages))
            obj.messages = c.messages;
        const analysis = c.analysis;
        if (analysis && typeof analysis === 'object' && !Array.isArray(analysis)) {
            const a = analysis;
            if (!obj.feedback && typeof a.summaryFeedback === 'string')
                obj.feedback = a.summaryFeedback;
            if (!obj.scores && (0, interviewConversation_1.isObject)(a.scores))
                obj.scores = a.scores;
            if (!obj.insights && Array.isArray(a.strengths)) {
                const opp = Array.isArray(a.opportunities) ? a.opportunities : [];
                obj.insights = [...a.strengths, ...opp].slice(0, 8);
            }
        }
        delete obj.conversation;
    }
    delete obj.serialization;
    delete obj.perQuestion;
    const feedback = typeof obj.feedback === 'string' ? obj.feedback : '';
    const insights = trimNonEmptyStrings(obj.insights);
    const filled = backfillTraitsFromLegacy(obj, feedback, insights);
    const messagesRaw = Array.isArray(obj.messages) ? obj.messages : [];
    const messages = messagesRaw.map(normalizeMessageForApi).filter((m) => m !== null);
    const out = {
        ...obj,
        analysisVersion: typeof obj.analysisVersion === 'number' ? obj.analysisVersion : CURRENT_ANALYSIS_VERSION,
        insights: insights.length >= 1 ? insights : [filled.strengthInsights[0] || 'See summary feedback'],
        topTraits: filled.topTraits.length >= 2 ? filled.topTraits : ['Engaged respondent', 'Clear communicator'],
        strengthAreas: filled.strengthAreas,
        strengthInsights: filled.strengthInsights,
        opportunityAreas: filled.opportunityAreas,
        opportunityInsights: filled.opportunityInsights,
        messages: messages.length > 0 ? messages : obj.messages
    };
    delete out.schemaVersion;
    delete out.conversation;
    delete out.aiAttributes;
    return out;
}
function sanitizeAiAnalysisForPersistence(analysis) {
    const participants = analysis.participants ?? (0, interviewConversation_2.buildDefaultParticipants)();
    const messages = analysis.messages.map(m => {
        const row = {
            id: m.id,
            role: m.role,
            speakerId: m.speakerId,
            text: m.text,
            edited: m.edited
        };
        if (typeof m.startMs === 'number')
            row.startMs = m.startMs;
        if (typeof m.endMs === 'number')
            row.endMs = m.endMs;
        if (m.role === 'candidate' && m.feedback?.flag) {
            row.feedback = { flag: m.feedback.flag };
        }
        return row;
    });
    return {
        analysisVersion: analysis.analysisVersion,
        feedback: analysis.feedback,
        scores: analysis.scores,
        insights: analysis.insights,
        topTraits: analysis.topTraits,
        strengthAreas: analysis.strengthAreas,
        strengthInsights: analysis.strengthInsights,
        opportunityAreas: analysis.opportunityAreas,
        opportunityInsights: analysis.opportunityInsights,
        participants,
        messages
    };
}
//# sourceMappingURL=sessionAiAnalysis.js.map