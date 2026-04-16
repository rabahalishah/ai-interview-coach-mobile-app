"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateOpenAiCallCostUsd = estimateOpenAiCallCostUsd;
const INPUT_PER_M = {
    'gpt-4': 30,
    'gpt-4-0314': 30,
    'gpt-4-0613': 30,
    'gpt-4o': 2.5,
    'gpt-4o-mini': 0.15,
    'gpt-5-mini': 0.25,
    'gpt-5.4-mini': 0.75,
    'gpt-3.5-turbo': 0.5
};
const OUTPUT_PER_M = {
    'gpt-4': 60,
    'gpt-4-0314': 60,
    'gpt-4-0613': 60,
    'gpt-4o': 10,
    'gpt-4o-mini': 0.6,
    'gpt-5-mini': 2,
    'gpt-5.4-mini': 4.5,
    'gpt-3.5-turbo': 1.5
};
function rateFor(map, model) {
    const m = model.trim().toLowerCase();
    if (map[m] !== undefined)
        return map[m];
    const key = Object.keys(map).find(k => m.startsWith(k) || m.includes(k));
    return key ? map[key] : map['gpt-5-mini'] ?? 1;
}
function estimateOpenAiCallCostUsd(model, promptTokens, completionTokens) {
    const inR = rateFor(INPUT_PER_M, model);
    const outR = rateFor(OUTPUT_PER_M, model);
    return (promptTokens / 1000000) * inR + (completionTokens / 1000000) * outR;
}
//# sourceMappingURL=openaiCost.js.map