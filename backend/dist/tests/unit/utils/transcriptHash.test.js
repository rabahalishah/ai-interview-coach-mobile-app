"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transcriptHash_1 = require("../../../src/utils/transcriptHash");
describe('transcriptHash', () => {
    it('is stable for same input', () => {
        const t = 'same transcript';
        expect((0, transcriptHash_1.sha256Transcript)(t)).toBe((0, transcriptHash_1.sha256Transcript)(t));
    });
    it('differs for different input', () => {
        expect((0, transcriptHash_1.sha256Transcript)('a')).not.toBe((0, transcriptHash_1.sha256Transcript)('b'));
    });
});
//# sourceMappingURL=transcriptHash.test.js.map