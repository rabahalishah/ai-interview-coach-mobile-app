"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = isObject;
exports.normalizeCandidateFlag = normalizeCandidateFlag;
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const VALID_FLAGS = new Set(['Good', 'Improvement', 'Neutral']);
function normalizeCandidateFlag(value) {
    if (typeof value !== 'string')
        return undefined;
    return VALID_FLAGS.has(value) ? value : undefined;
}
//# sourceMappingURL=interviewConversation.js.map