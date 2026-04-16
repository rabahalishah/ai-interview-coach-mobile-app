"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProfileRoutes = createProfileRoutes;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const rateLimiting_1 = require("../middleware/rateLimiting");
const fileUpload_1 = require("../utils/fileUpload");
const validation_1 = require("../middleware/validation");
const auth_2 = require("../types/auth");
function createProfileRoutes(services) {
    const router = (0, express_1.Router)();
    const { profileService } = services;
    router.use(auth_1.authenticate);
    router.use(auth_1.requireEmailVerified);
    router.use((0, security_1.enforceDataIsolation)('profile'));
    router.get('/', async (req, res, next) => {
        try {
            const userId = req.user.id;
            const profile = await profileService.getProfile(userId);
            res.json({
                success: true,
                data: profile
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.put('/', (0, validation_1.validateRequest)(validation_1.validationSchemas.profile.update), async (req, res, next) => {
        try {
            const userId = req.user.id;
            const updateData = req.body;
            const updatedProfile = await profileService.updateProfile(userId, updateData);
            res.json({
                success: true,
                data: updatedProfile,
                message: 'Profile updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/manual-entry', (0, validation_1.validateRequest)(validation_1.validationSchemas.profile.update), async (req, res, next) => {
        try {
            const userId = req.user.id;
            const profileData = req.body;
            if (!profileData.fullName) {
                throw new auth_2.ValidationError('Full name is required for manual entry');
            }
            const updatedProfile = await profileService.updateProfile(userId, profileData);
            res.json({
                success: true,
                data: updatedProfile,
                message: 'Profile information saved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/resume', rateLimiting_1.uploadRateLimit, fileUpload_1.resumeUpload.single('resume'), async (req, res, next) => {
        try {
            const userId = req.user.id;
            const file = req.file;
            if (!file) {
                throw new auth_2.ValidationError('Resume file is required');
            }
            const resumeS3Key = await profileService.uploadResume(userId, file.buffer, file.originalname);
            res.json({
                success: true,
                data: {
                    resumeS3Key,
                    filename: file.originalname,
                    size: file.size
                },
                message: 'Resume uploaded successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/resume/url', async (req, res, next) => {
        try {
            const userId = req.user.id;
            const expiresIn = parseInt(req.query['expiresIn'] || '3600');
            if (expiresIn <= 0 || expiresIn > 86400) {
                throw new auth_2.ValidationError('expiresIn must be between 1 and 86400 seconds');
            }
            const signedUrl = await profileService.getResumeUrl(userId, expiresIn);
            res.json({
                success: true,
                data: {
                    url: signedUrl,
                    expiresIn,
                    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
                },
                message: 'Resume URL generated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.put('/target-role', (0, validation_1.validateRequest)(validation_1.validationSchemas.profile.targetRole), async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { targetIndustry, targetJobTitle } = req.body;
            await profileService.setTargetRole(userId, targetIndustry, targetJobTitle);
            res.json({
                success: true,
                message: 'Target role updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.delete('/', async (req, res, next) => {
        try {
            const userId = req.user.id;
            await profileService.deleteProfile(userId);
            res.json({
                success: true,
                message: 'Profile deleted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/ai-attributes', async (req, res, next) => {
        try {
            const userId = req.user.id;
            const attributes = await profileService.getAIAttributes(userId);
            res.json({
                success: true,
                data: attributes
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
exports.default = createProfileRoutes;
//# sourceMappingURL=profile.js.map