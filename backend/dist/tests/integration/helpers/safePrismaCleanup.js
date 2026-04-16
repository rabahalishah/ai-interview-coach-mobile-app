"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeEmailVerificationOTPDeleteMany = safeEmailVerificationOTPDeleteMany;
const TABLE_DOES_NOT_EXIST = 'P2021';
function isMissingTableError(e) {
    return (typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === TABLE_DOES_NOT_EXIST);
}
async function safeEmailVerificationOTPDeleteMany(prisma, where) {
    try {
        await prisma.emailVerificationOTP.deleteMany({ where });
    }
    catch (e) {
        if (!isMissingTableError(e))
            throw e;
    }
}
//# sourceMappingURL=safePrismaCleanup.js.map