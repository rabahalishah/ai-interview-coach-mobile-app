"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../../src/utils/jwt");
describe('JWT Utils Simple', () => {
    const mockPayload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        subscriptionTier: 'free',
        emailVerified: true
    };
    beforeEach(() => {
        process.env['JWT_SECRET'] = 'test-secret-key';
        process.env['JWT_EXPIRES_IN'] = '1h';
        process.env['JWT_ISSUER'] = 'test-issuer';
    });
    afterEach(() => {
        delete process.env['JWT_SECRET'];
        delete process.env['JWT_EXPIRES_IN'];
        delete process.env['JWT_ISSUER'];
    });
    it('should generate a valid JWT token', () => {
        const token = jwt_1.jwtUtils.generateToken(mockPayload);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3);
    });
    it('should validate and decode a valid token', () => {
        const token = jwt_1.jwtUtils.generateToken(mockPayload);
        const decoded = jwt_1.jwtUtils.validateToken(token);
        expect(decoded.userId).toBe(mockPayload.userId);
        expect(decoded.email).toBe(mockPayload.email);
        expect(decoded.subscriptionTier).toBe(mockPayload.subscriptionTier);
    });
});
//# sourceMappingURL=jwt.test.js.map