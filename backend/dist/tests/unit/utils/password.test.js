"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const password_1 = require("../../../src/utils/password");
describe('Password Utils Simple', () => {
    beforeEach(() => {
        process.env['BCRYPT_SALT_ROUNDS'] = '10';
        process.env['PASSWORD_MIN_LENGTH'] = '8';
        process.env['PASSWORD_MAX_LENGTH'] = '128';
    });
    afterEach(() => {
        delete process.env['BCRYPT_SALT_ROUNDS'];
        delete process.env['PASSWORD_MIN_LENGTH'];
        delete process.env['PASSWORD_MAX_LENGTH'];
    });
    it('should validate a strong password', () => {
        const strongPassword = 'StrongPass123!';
        expect(() => password_1.passwordUtils.validatePassword(strongPassword)).not.toThrow();
    });
    it('should hash a valid password', async () => {
        const password = 'ValidPass123!';
        const hash = await password_1.passwordUtils.hashPassword(password);
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(50);
    });
    it('should verify correct password', async () => {
        const password = 'CorrectPass123!';
        const hash = await password_1.passwordUtils.hashPassword(password);
        const isValid = await password_1.passwordUtils.verifyPassword(password, hash);
        expect(isValid).toBe(true);
    });
    it('should reject incorrect password', async () => {
        const password = 'CorrectPass123!';
        const wrongPassword = 'WrongPass123!';
        const hash = await password_1.passwordUtils.hashPassword(password);
        const isValid = await password_1.passwordUtils.verifyPassword(wrongPassword, hash);
        expect(isValid).toBe(false);
    });
});
//# sourceMappingURL=password.test.js.map