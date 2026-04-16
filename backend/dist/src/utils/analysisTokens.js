"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokenCountForText = estimateTokenCountForText;
exports.estimateChatInputTokens = estimateChatInputTokens;
const js_tiktoken_1 = require("js-tiktoken");
function estimateTokenCountForText(text, model) {
    try {
        const encName = (0, js_tiktoken_1.getEncodingNameForModel)(model);
        const enc = (0, js_tiktoken_1.getEncoding)(encName);
        return enc.encode(text).length;
    }
    catch {
        try {
            const enc = (0, js_tiktoken_1.getEncoding)('o200k_base');
            return enc.encode(text).length;
        }
        catch {
            const enc = (0, js_tiktoken_1.getEncoding)('cl100k_base');
            return enc.encode(text).length;
        }
    }
}
function estimateChatInputTokens(systemText, userText, model) {
    return estimateTokenCountForText(systemText + userText, model);
}
//# sourceMappingURL=analysisTokens.js.map