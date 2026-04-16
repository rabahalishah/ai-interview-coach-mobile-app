"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeTextExtractor = exports.DOCXTextExtractor = exports.PDFTextExtractor = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
const { PDFParse } = require('pdf-parse');
class PDFTextExtractor {
    canHandle(filename) {
        return filename.toLowerCase().endsWith('.pdf');
    }
    async extract(buffer) {
        try {
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            await parser.destroy();
            return result.text;
        }
        catch (error) {
            throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.PDFTextExtractor = PDFTextExtractor;
class DOCXTextExtractor {
    canHandle(filename) {
        const lower = filename.toLowerCase();
        return lower.endsWith('.doc') || lower.endsWith('.docx');
    }
    async extract(buffer) {
        try {
            const result = await mammoth_1.default.extractRawText({ buffer });
            return result.value;
        }
        catch (error) {
            throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.DOCXTextExtractor = DOCXTextExtractor;
class ResumeTextExtractor {
    constructor() {
        this.extractors = [
            new PDFTextExtractor(),
            new DOCXTextExtractor()
        ];
    }
    async extractText(buffer, filename) {
        const extractor = this.extractors.find(e => e.canHandle(filename));
        if (!extractor) {
            throw new Error(`Unsupported file type: ${filename}`);
        }
        const text = await extractor.extract(buffer);
        if (!text || text.trim().length === 0) {
            throw new Error(`No text content extracted from file: ${filename}`);
        }
        return text;
    }
    isSupported(filename) {
        return this.extractors.some(e => e.canHandle(filename));
    }
    getSupportedExtensions() {
        return ['.pdf', '.doc', '.docx'];
    }
}
exports.ResumeTextExtractor = ResumeTextExtractor;
//# sourceMappingURL=ResumeTextExtractor.js.map