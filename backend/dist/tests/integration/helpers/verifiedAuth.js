"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerifiedAuthToken = getVerifiedAuthToken;
exports.verifyUserEmailInDbAndLogin = verifyUserEmailInDbAndLogin;
const supertest_1 = __importDefault(require("supertest"));
const prisma_1 = __importDefault(require("../../../src/lib/prisma"));
const safePrismaCleanup_1 = require("./safePrismaCleanup");
async function getVerifiedAuthToken(app, email, password) {
    await (0, supertest_1.default)(app)
        .post('/api/auth/register')
        .send({ email, password })
        .expect(201);
    const user = await prisma_1.default.user.findUnique({
        where: { email: email.toLowerCase() }
    });
    if (!user) {
        throw new Error(`Expected user after register: ${email}`);
    }
    await prisma_1.default.user.update({
        where: { id: user.id },
        data: { emailVerified: true }
    });
    await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma_1.default, { email: email.toLowerCase() });
    const res = await (0, supertest_1.default)(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);
    return {
        token: res.body.data.token,
        userId: user.id
    };
}
async function verifyUserEmailInDbAndLogin(app, email, password) {
    const user = await prisma_1.default.user.findUnique({
        where: { email: email.toLowerCase() }
    });
    if (!user) {
        throw new Error(`User not found for verify+login: ${email}`);
    }
    await prisma_1.default.user.update({
        where: { id: user.id },
        data: { emailVerified: true }
    });
    await (0, safePrismaCleanup_1.safeEmailVerificationOTPDeleteMany)(prisma_1.default, { email: email.toLowerCase() });
    const res = await (0, supertest_1.default)(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);
    return {
        token: res.body.data.token,
        userId: user.id
    };
}
//# sourceMappingURL=verifiedAuth.js.map