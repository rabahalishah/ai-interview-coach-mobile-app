"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Transcript = sha256Transcript;
const crypto_1 = require("crypto");
function sha256Transcript(transcript) {
    return (0, crypto_1.createHash)('sha256').update(transcript, 'utf8').digest('hex');
}
//# sourceMappingURL=transcriptHash.js.map