"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const analysisTokens_1 = require("../../../src/utils/analysisTokens");
describe('analysisTokens', () => {
    it('estimateTokenCountForText returns positive integers', () => {
        const n = (0, analysisTokens_1.estimateTokenCountForText)('Hello world. '.repeat(20), 'gpt-5-mini');
        expect(n).toBeGreaterThan(10);
    });
    it('estimateChatInputTokens is at least max of parts', () => {
        const a = (0, analysisTokens_1.estimateTokenCountForText)('aaa', 'gpt-5-mini');
        const b = (0, analysisTokens_1.estimateTokenCountForText)('bbb', 'gpt-5-mini');
        const c = (0, analysisTokens_1.estimateChatInputTokens)('aaa', 'bbb', 'gpt-5-mini');
        expect(c).toBeGreaterThanOrEqual(a + b - 2);
    });
});
//# sourceMappingURL=analysisTokens.test.js.map