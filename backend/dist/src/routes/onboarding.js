"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOnboardingRoutes = createOnboardingRoutes;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const rateLimiting_1 = require("../middleware/rateLimiting");
const fileUpload_1 = require("../utils/fileUpload");
const auth_2 = require("../types/auth");
function parseManualProfile(body) {
    const raw = body.manualProfile ?? body.profile;
    if (raw === undefined || raw === null || raw === '') {
        return undefined;
    }
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        return raw;
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
        catch {
            throw new auth_2.ValidationError('manualProfile must be valid JSON');
        }
    }
    throw new auth_2.ValidationError('manualProfile must be a JSON object or string');
}
function parsePrimaryManual(req) {
    const fromNested = parseManualProfile(req.body);
    if (fromNested) {
        return fromNested;
    }
    const b = req.body;
    if (b && typeof b === 'object' && !Array.isArray(b)) {
        const keys = [
            'fullName',
            'currentJobTitle',
            'currentCompany',
            'school',
            'degreeInfo',
            'previousJobTitles',
            'targetIndustry',
            'targetJobTitle',
            'experienceLevel'
        ];
        if (keys.some((k) => b[k] !== undefined)) {
            return b;
        }
    }
    return undefined;
}
function createOnboardingRoutes(services) {
    const router = (0, express_1.Router)();
    const { onboardingService } = services;
    router.use(auth_1.authenticate);
    router.use(auth_1.requireEmailVerified);
    router.post('/primary', rateLimiting_1.uploadRateLimit, (req, res, next) => {
        fileUpload_1.resumeUpload.single('resume')(req, res, (err) => {
            if (err) {
                next(err);
                return;
            }
            next();
        });
    }, (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const file = req.file;
        const manual = parsePrimaryManual(req);
        if (file && manual && Object.keys(manual).length > 0) {
            throw new auth_2.ValidationError('Provide exactly one of: resume file or manual profile, not both');
        }
        const result = await onboardingService.primary(userId, {
            resumeBuffer: file?.buffer,
            resumeFilename: file?.originalname,
            manual
        });
        res.status(200).json({
            success: true,
            message: 'Primary onboarding step saved',
            data: result
        });
    }));
    const voiceStepHandlers = [
        rateLimiting_1.uploadRateLimit,
        (req, res, next) => {
            (0, fileUpload_1.onboardingVoiceUpload)(req, res, (err) => {
                if (err) {
                    next(err);
                    return;
                }
                next();
            });
        },
        (0, error_1.asyncHandler)(async (req, res) => {
            const userId = req.user.id;
            const list = req.files;
            const file = list?.find((f) => (f.buffer?.length ?? 0) > 0) ?? list?.[0];
            if (!file?.buffer?.length) {
                throw new auth_2.ValidationError('Audio file is required (multipart form-data: one file part; any field name is OK, e.g. audio).');
            }
            const result = await onboardingService.voice(userId, file.buffer, file.originalname);
            res.status(200).json({
                success: true,
                message: 'Voice intro processed',
                data: result
            });
        })
    ];
    router.post('/voice', ...voiceStepHandlers);
    router.post('/primary/voice', ...voiceStepHandlers);
    router.post('/complete', rateLimiting_1.uploadRateLimit, (0, error_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const result = await onboardingService.complete(userId);
        res.status(200).json({
            success: true,
            message: 'Onboarding complete',
            data: result
        });
    }));
    return router;
}
//# sourceMappingURL=onboarding.js.map