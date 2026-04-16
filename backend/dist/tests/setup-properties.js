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
exports.arbitraries = void 0;
const fc = __importStar(require("fast-check"));
const seedValue = process.env['FC_SEED'] ? parseInt(process.env['FC_SEED']) : undefined;
fc.configureGlobal({
    numRuns: 100,
    verbose: process.env['NODE_ENV'] === 'development',
    ...(seedValue !== undefined && { seed: seedValue }),
});
exports.arbitraries = {
    email: () => fc.emailAddress(),
    password: () => fc.constantFrom('Password123!', 'SecurePass456@', 'MyPassword789#', 'TestPass012$', 'ValidPass345%', 'StrongPass678^', 'GoodPass901&', 'SafePass234*'),
    userId: () => fc.constantFrom('user123456789', 'test987654321', 'auth456789012', 'demo345678901', 'sample234567890', 'valid123456789', 'mock987654321', 'fake456789012'),
    sessionId: () => fc.constantFrom('sess123456789', 'audio987654321', 'rec456789012', 'session345678901'),
    score: () => fc.integer({ min: 1, max: 5 }),
    subscriptionTier: () => fc.constantFrom('free', 'paid'),
    industry: () => fc.constantFrom('Technology', 'Finance', 'Healthcare', 'Consulting'),
    jobTitle: () => fc.constantFrom('Software Engineer', 'Product Manager', 'Data Scientist', 'Financial Analyst', 'Investment Banker', 'Management Consultant'),
    audioBuffer: () => fc.uint8Array({ minLength: 1000, maxLength: 10000 }),
    resumeText: () => fc.lorem({ maxCount: 500 }),
};
//# sourceMappingURL=setup-properties.js.map