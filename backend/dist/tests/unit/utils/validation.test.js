"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const validation_1 = require("../../../src/utils/validation");
describe('Validation Utils Simple', () => {
    describe('ValidationUtils.validate', () => {
        const testSchema = joi_1.default.object({
            name: joi_1.default.string().required(),
            age: joi_1.default.number().min(0).max(120),
            email: joi_1.default.string().email()
        });
        it('should validate valid data', () => {
            const validData = {
                name: 'John Doe',
                age: 30,
                email: 'john@example.com'
            };
            const result = validation_1.ValidationUtils.validate(validData, testSchema);
            expect(result).toEqual(validData);
        });
        it('should throw ValidationError for invalid data', () => {
            const invalidData = {
                name: '',
                age: -5,
                email: 'invalid-email'
            };
            expect(() => validation_1.ValidationUtils.validate(invalidData, testSchema)).toThrow();
        });
    });
    describe('Auth Schemas', () => {
        it('should validate valid registration data', () => {
            const validData = {
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const result = validation_1.ValidationUtils.validate(validData, validation_1.authSchemas.register);
            expect(result.email).toBe('test@example.com');
            expect(result.password).toBe('StrongPass123!');
        });
        it('should reject invalid email', () => {
            const invalidData = {
                email: 'invalid-email',
                password: 'StrongPass123!'
            };
            expect(() => validation_1.ValidationUtils.validate(invalidData, validation_1.authSchemas.register)).toThrow();
        });
    });
    describe('ValidationUtils.sanitizeString', () => {
        it('should sanitize string input', () => {
            const input = '  <script>alert("xss")</script>  ';
            const sanitized = validation_1.ValidationUtils.sanitizeString(input);
            expect(sanitized).toBe('scriptalert("xss")/script');
            expect(sanitized).not.toContain('<');
            expect(sanitized).not.toContain('>');
        });
        it('should return empty string for non-string input', () => {
            expect(validation_1.ValidationUtils.sanitizeString(123)).toBe('');
            expect(validation_1.ValidationUtils.sanitizeString(null)).toBe('');
            expect(validation_1.ValidationUtils.sanitizeString(undefined)).toBe('');
        });
    });
});
//# sourceMappingURL=validation.test.js.map