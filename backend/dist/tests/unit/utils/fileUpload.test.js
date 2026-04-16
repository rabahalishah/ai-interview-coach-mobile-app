"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fileUpload_1 = require("../../../src/utils/fileUpload");
const auth_1 = require("../../../src/types/auth");
describe('fileUpload utilities', () => {
    describe('sanitizeFilename', () => {
        describe('unit tests', () => {
            it('should preserve alphanumeric characters', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('test123ABC.pdf');
                expect(result).toBe('test123ABC.pdf');
            });
            it('should preserve dots', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('my.file.name.pdf');
                expect(result).toBe('my.file.name.pdf');
            });
            it('should preserve hyphens', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('my-file-name.pdf');
                expect(result).toBe('my-file-name.pdf');
            });
            it('should preserve underscores', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('my_file_name.pdf');
                expect(result).toBe('my_file_name.pdf');
            });
            it('should replace spaces with underscores', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('my file name.pdf');
                expect(result).toBe('my_file_name.pdf');
            });
            it('should replace special characters with underscores', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('file@name#test$.pdf');
                expect(result).toBe('file_name_test_.pdf');
            });
            it('should replace multiple special characters', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('file!@#$%^&*()name.pdf');
                expect(result).toBe('file__________name.pdf');
            });
            it('should handle unicode characters', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('résumé_français.pdf');
                expect(result).toBe('r_sum__fran_ais.pdf');
            });
            it('should handle parentheses and brackets', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('file(1)[copy].pdf');
                expect(result).toBe('file_1__copy_.pdf');
            });
            it('should handle slashes and backslashes', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('path/to\\file.pdf');
                expect(result).toBe('path_to_file.pdf');
            });
            it('should preserve case sensitivity', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('MyFileName.PDF');
                expect(result).toBe('MyFileName.PDF');
            });
            it('should handle empty string', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('');
                expect(result).toBe('');
            });
            it('should handle filename with only special characters', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('@#$%^&*()');
                expect(result).toBe('_________');
            });
            it('should handle filename with mixed valid and invalid characters', () => {
                const result = (0, fileUpload_1.sanitizeFilename)('user@example.com_resume-2024.pdf');
                expect(result).toBe('user_example.com_resume-2024.pdf');
            });
        });
    });
    describe('validateFileBuffer', () => {
        it('should pass validation for valid file', () => {
            const buffer = Buffer.from('test content');
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.pdf')).not.toThrow();
        });
        it('should throw ValidationError for empty buffer', () => {
            const buffer = Buffer.from('');
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.pdf')).toThrow(auth_1.ValidationError);
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.pdf')).toThrow('below minimum required size');
        });
        it('should throw ValidationError for oversized file', () => {
            const buffer = Buffer.alloc(51 * 1024 * 1024);
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.pdf')).toThrow(auth_1.ValidationError);
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.pdf')).toThrow('exceeds maximum allowed size');
        });
        it('should throw ValidationError for file without extension', () => {
            const buffer = Buffer.from('test content');
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'testfile')).toThrow(auth_1.ValidationError);
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'testfile')).toThrow('not allowed');
        });
        it('should throw ValidationError for unsupported file type', () => {
            const buffer = Buffer.from('test content');
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.exe')).toThrow(auth_1.ValidationError);
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.exe')).toThrow('not allowed');
        });
        it('should accept custom allowed types', () => {
            const buffer = Buffer.from('test content');
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.txt', { allowedTypes: ['.txt'] })).not.toThrow();
        });
        it('should accept custom max size', () => {
            const buffer = Buffer.alloc(100);
            expect(() => (0, fileUpload_1.validateFileBuffer)(buffer, 'test.pdf', { maxSizeBytes: 50 })).toThrow(auth_1.ValidationError);
        });
    });
    describe('getContentTypeFromExtension', () => {
        it('should return correct content type for PDF', () => {
            expect((0, fileUpload_1.getContentTypeFromExtension)('.pdf')).toBe('application/pdf');
        });
        it('should return correct content type for DOC', () => {
            expect((0, fileUpload_1.getContentTypeFromExtension)('.doc')).toBe('application/msword');
        });
        it('should return correct content type for DOCX', () => {
            expect((0, fileUpload_1.getContentTypeFromExtension)('.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        });
        it('should return correct content type for MP3', () => {
            expect((0, fileUpload_1.getContentTypeFromExtension)('.mp3')).toBe('audio/mpeg');
        });
        it('should handle case insensitivity', () => {
            expect((0, fileUpload_1.getContentTypeFromExtension)('.PDF')).toBe('application/pdf');
        });
        it('should return default content type for unknown extension', () => {
            expect((0, fileUpload_1.getContentTypeFromExtension)('.xyz')).toBe('application/octet-stream');
        });
    });
});
//# sourceMappingURL=fileUpload.test.js.map