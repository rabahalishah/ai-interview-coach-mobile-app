"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVerifiedUserWithProfile = createVerifiedUserWithProfile;
const prisma_1 = __importDefault(require("../../../src/lib/prisma"));
const password_1 = require("../../../src/utils/password");
const auth_1 = require("../../../src/types/auth");
async function createVerifiedUserWithProfile(email, password) {
    const passwordHash = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.default.user.create({
        data: {
            email: email.toLowerCase(),
            passwordHash,
            subscriptionTier: auth_1.SubscriptionTier.FREE,
            emailVerified: true
        }
    });
    await prisma_1.default.userProfile.create({
        data: {
            userId: user.id,
            aiAttributes: {},
            extractedSkills: []
        }
    });
    return user;
}
//# sourceMappingURL=testUserFactory.js.map