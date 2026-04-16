"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const fileUpload_1 = require("../../src/utils/fileUpload");
describe('Property 17: Filename Sanitization', () => {
    describe('Property 17: Filename sanitization replaces special characters with underscores', () => {
        it('should only contain alphanumeric, dots, hyphens, and underscores after sanitization', () => {
            fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 255 }), (filename) => {
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                const validPattern = /^[a-zA-Z0-9._-]*$/;
                expect(sanitized).toMatch(validPattern);
            }), { numRuns: 100 });
        });
        it('should preserve all valid characters (alphanumeric, dots, hyphens, underscores)', () => {
            fc.assert(fc.property(fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-'.split(''))), (filename) => {
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                expect(sanitized).toBe(filename);
            }), { numRuns: 100 });
        });
        it('should replace each special character with exactly one underscore', () => {
            fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 100 }), (filename) => {
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                const specialCharsCount = (filename.match(/[^a-zA-Z0-9._-]/g) || []).length;
                const originalUnderscores = (filename.match(/_/g) || []).length;
                const totalUnderscores = (sanitized.match(/_/g) || []).length;
                const addedUnderscores = totalUnderscores - originalUnderscores;
                expect(addedUnderscores).toBe(specialCharsCount);
            }), { numRuns: 100 });
        });
        it('should maintain the same length as original filename', () => {
            fc.assert(fc.property(fc.string({ minLength: 0, maxLength: 255 }), (filename) => {
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                expect(sanitized.length).toBe(filename.length);
            }), { numRuns: 100 });
        });
        it('should be idempotent (sanitizing twice gives same result)', () => {
            fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 255 }), (filename) => {
                const sanitized1 = (0, fileUpload_1.sanitizeFilename)(filename);
                const sanitized2 = (0, fileUpload_1.sanitizeFilename)(sanitized1);
                expect(sanitized2).toBe(sanitized1);
            }), { numRuns: 100 });
        });
        it('should preserve file extensions correctly', () => {
            fc.assert(fc.property(fc.tuple(fc.string({ minLength: 1, maxLength: 50 }), fc.constantFrom('pdf', 'doc', 'docx', 'txt', 'mp3', 'wav')), ([basename, extension]) => {
                const filename = `${basename}.${extension}`;
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                expect(sanitized).toContain(`.${extension}`);
                expect(sanitized.endsWith(`.${extension}`)).toBe(true);
            }), { numRuns: 100 });
        });
        it('should handle empty string without error', () => {
            const result = (0, fileUpload_1.sanitizeFilename)('');
            expect(result).toBe('');
        });
        it('should preserve case sensitivity', () => {
            fc.assert(fc.property(fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''))), (filename) => {
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                expect(sanitized).toBe(filename);
            }), { numRuns: 100 });
        });
        it('should handle filenames with common special characters', () => {
            fc.assert(fc.property(fc.tuple(fc.string({ minLength: 1, maxLength: 20 }), fc.constantFrom(' ', '@', '#', '$', '%', '&', '*', '(', ')', '[', ']', '{', '}', '/', '\\', '|', ':', ';', '"', "'", '<', '>', ',', '?', '!'), fc.string({ minLength: 1, maxLength: 20 })), ([prefix, specialChar, suffix]) => {
                const filename = `${prefix}${specialChar}${suffix}`;
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                expect(sanitized).not.toContain(specialChar);
                expect(sanitized).toContain('_');
            }), { numRuns: 100 });
        });
        it('should handle unicode characters by replacing them', () => {
            fc.assert(fc.property(fc.unicodeString({ minLength: 1, maxLength: 50 }), (filename) => {
                const sanitized = (0, fileUpload_1.sanitizeFilename)(filename);
                const validPattern = /^[a-zA-Z0-9._-]*$/;
                expect(sanitized).toMatch(validPattern);
            }), { numRuns: 100 });
        });
    });
});
//# sourceMappingURL=filename-sanitization.properties.test.js.map