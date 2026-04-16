"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionRoutes = createSessionRoutes;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const rateLimiting_1 = require("../middleware/rateLimiting");
const validation_1 = require("../middleware/validation");
const AudioSessionService_1 = require("../services/AudioSessionService");
const constants_1 = require("../utils/constants");
const sessionDisplayName_1 = require("../utils/sessionDisplayName");
function createSessionRoutes(services) {
    const router = (0, express_1.Router)();
    const { audioSessionService } = services;
    router.use(auth_1.authenticate);
    router.use(auth_1.requireEmailVerified);
    const upload = (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: {
            fileSize: constants_1.FILE_SIZE_LIMITS.AUDIO,
        },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('audio/')) {
                cb(null, true);
            }
            else {
                cb(new Error('Only audio files are allowed'));
            }
        }
    });
    router.post('/start', rateLimiting_1.aiProcessingRateLimit, async (req, res) => {
        try {
            const userId = req.user.id;
            const session = await audioSessionService.startSession(userId);
            res.status(201).json({
                success: true,
                data: {
                    sessionId: session.id,
                    status: session.status,
                    createdAt: session.createdAt
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof AudioSessionService_1.AudioSessionError) {
                let statusCode = 400;
                if (error.code === 'USER_NOT_FOUND') {
                    statusCode = 404;
                }
                else if (error.code === 'USAGE_LIMIT_EXCEEDED') {
                    statusCode = 429;
                }
                return res.status(statusCode).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Session creation error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to create session'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    router.post('/:id/audio', (0, security_1.enforceDataIsolation)('session'), (0, validation_1.validateRequest)(validation_1.validationSchemas.sessions.sessionId), rateLimiting_1.uploadRateLimit, upload.single('audio'), async (req, res) => {
        try {
            const sessionId = req.params.id;
            const userId = req.user.id;
            const audioFile = req.file;
            if (!audioFile) {
                return res.status(400).json({
                    error: {
                        code: 'MISSING_AUDIO_FILE',
                        message: 'Audio file is required'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            const session = await audioSessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: {
                        code: 'SESSION_NOT_FOUND',
                        message: 'Session not found'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            if (session.userId !== userId) {
                return res.status(403).json({
                    error: {
                        code: 'SESSION_ACCESS_DENIED',
                        message: 'You do not have access to this session'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            await audioSessionService.uploadAudio(sessionId, audioFile.buffer, audioFile.originalname);
            res.status(200).json({
                success: true,
                message: 'Audio uploaded successfully. Processing started.',
                data: {
                    sessionId,
                    status: 'processing'
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof AudioSessionService_1.AudioSessionError) {
                const statusCode = error.code === 'SESSION_NOT_FOUND' ? 404 :
                    error.code === 'INVALID_SESSION_STATE' ? 409 : 400;
                return res.status(statusCode).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Audio upload error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to upload audio'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    router.get('/history', (0, security_1.enforceDataIsolation)('session'), (0, validation_1.validateRequest)(validation_1.validationSchemas.sessions.history), async (req, res) => {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 20;
            const statusFilter = req.query.status || 'completed';
            if (limit < 1 || limit > 100) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_LIMIT',
                        message: 'Limit must be between 1 and 100'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            const validStatuses = ['completed', 'processing', 'failed', 'pending', 'all'];
            if (!validStatuses.includes(statusFilter)) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_STATUS',
                        message: `Status must be one of: ${validStatuses.join(', ')}`
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            const sessions = await audioSessionService.getSessionHistory(userId, limit, statusFilter);
            const formattedSessions = sessions.map(session => ({
                id: session.id,
                displayName: session.displayName ?? (0, sessionDisplayName_1.formatSessionDisplayName)(session.createdAt),
                status: session.status,
                scores: {
                    clarity: session.clarityScore,
                    confidence: session.confidenceScore,
                    tone: session.toneScore,
                    enthusiasm: session.enthusiasmScore,
                    specificity: session.specificityScore
                },
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            }));
            res.status(200).json({
                success: true,
                data: {
                    sessions: formattedSessions,
                    total: sessions.length,
                    filter: statusFilter
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof AudioSessionService_1.AudioSessionError) {
                return res.status(400).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Session history error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve session history'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    router.patch('/:id/transcript', (0, security_1.enforceDataIsolation)('session'), (0, validation_1.validateRequest)(validation_1.validationSchemas.sessions.updateTranscript), rateLimiting_1.aiProcessingRateLimit, async (req, res) => {
        try {
            const sessionId = req.params.id;
            const userId = req.user.id;
            const { transcript, conversation } = req.body;
            const session = await audioSessionService.updateTranscriptAndReanalyze(sessionId, userId, {
                transcript,
                conversation
            });
            res.status(200).json({
                success: true,
                message: 'Transcript updated and analysis completed',
                data: {
                    id: session.id,
                    status: session.status,
                    transcript: session.transcript,
                    aiAnalysis: session.aiAnalysis,
                    scores: {
                        clarity: session.clarityScore,
                        confidence: session.confidenceScore,
                        tone: session.toneScore,
                        enthusiasm: session.enthusiasmScore,
                        specificity: session.specificityScore
                    },
                    updatedAt: session.updatedAt
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof AudioSessionService_1.AudioSessionError) {
                const statusCode = error.code === 'SESSION_NOT_FOUND' ? 404 :
                    error.code === 'SESSION_ACCESS_DENIED' ? 403 : 400;
                return res.status(statusCode).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Transcript update error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to update transcript and re-analyze'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    router.patch('/:id', (0, security_1.enforceDataIsolation)('session'), (0, validation_1.validateRequest)(validation_1.validationSchemas.sessions.updateDisplayName), async (req, res) => {
        try {
            const sessionId = req.params.id;
            const userId = req.user.id;
            const { displayName } = req.body;
            const session = await audioSessionService.updateSessionDisplayName(sessionId, userId, displayName === undefined ? undefined : (displayName === '' ? null : displayName));
            res.status(200).json({
                success: true,
                message: 'Session display name updated',
                data: {
                    id: session.id,
                    displayName: session.displayName ?? null,
                    updatedAt: session.updatedAt
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof AudioSessionService_1.AudioSessionError) {
                const statusCode = error.code === 'SESSION_NOT_FOUND' ? 404 :
                    error.code === 'SESSION_ACCESS_DENIED' ? 403 : 400;
                return res.status(statusCode).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Display name update error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to update session display name'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    router.get('/:id', (0, security_1.enforceDataIsolation)('session'), (0, validation_1.validateRequest)(validation_1.validationSchemas.sessions.sessionId), async (req, res) => {
        try {
            const sessionId = req.params.id;
            const userId = req.user.id;
            const session = await audioSessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: {
                        code: 'SESSION_NOT_FOUND',
                        message: 'Session not found'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            if (session.userId !== userId) {
                return res.status(403).json({
                    error: {
                        code: 'SESSION_ACCESS_DENIED',
                        message: 'You do not have access to this session'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            res.status(200).json({
                success: true,
                data: {
                    id: session.id,
                    displayName: session.displayName ?? null,
                    status: session.status,
                    transcript: session.transcript,
                    aiAnalysis: session.aiAnalysis,
                    scores: {
                        clarity: session.clarityScore,
                        confidence: session.confidenceScore,
                        tone: session.toneScore,
                        enthusiasm: session.enthusiasmScore,
                        specificity: session.specificityScore
                    },
                    analysisComplete: session.analysisComplete,
                    processingError: session.processingError,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof AudioSessionService_1.AudioSessionError) {
                return res.status(400).json({
                    error: {
                        code: error.code,
                        message: error.message
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            console.error('Session retrieval error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve session'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    router.get('/:id/audio-url', (0, security_1.enforceDataIsolation)('session'), (0, validation_1.validateRequest)(validation_1.validationSchemas.sessions.sessionId), async (req, res) => {
        try {
            const sessionId = req.params.id;
            const userId = req.user.id;
            const session = await audioSessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: {
                        code: 'SESSION_NOT_FOUND',
                        message: 'Session not found'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            if (session.userId !== userId) {
                return res.status(403).json({
                    error: {
                        code: 'SESSION_ACCESS_DENIED',
                        message: 'You do not have access to this session'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            if (!session.audioS3Key) {
                return res.status(404).json({
                    error: {
                        code: 'AUDIO_NOT_FOUND',
                        message: 'Audio file not found for this session'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            const presignedUrl = await services.s3Service.getSignedUrl(session.audioS3Key, 3600);
            res.status(200).json({
                success: true,
                data: {
                    url: presignedUrl,
                    expiresIn: 3600,
                    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
                }
            });
            return;
        }
        catch (error) {
            console.error('Audio URL generation error:', error);
            if (error && typeof error === 'object' && 'code' in error && error.code === 'AccessDenied') {
                return res.status(403).json({
                    error: {
                        code: 'S3_ACCESS_DENIED',
                        message: 'Unable to access audio file. S3 GetObject permission may be missing.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to generate audio URL'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    });
    return router;
}
exports.default = createSessionRoutes;
//# sourceMappingURL=sessions.js.map