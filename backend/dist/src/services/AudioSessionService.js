"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioSessionService = exports.AudioSessionError = exports.SessionStatus = void 0;
const SubscriptionService_1 = require("./SubscriptionService");
const fileUpload_1 = require("../utils/fileUpload");
const sessionDisplayName_1 = require("../utils/sessionDisplayName");
const interviewConversation_1 = require("../utils/interviewConversation");
const sessionAiAnalysis_1 = require("../utils/sessionAiAnalysis");
const config_1 = require("../utils/config");
const transcriptHash_1 = require("../utils/transcriptHash");
const analysisQueue_1 = require("../queues/analysisQueue");
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["PENDING"] = "pending";
    SessionStatus["PROCESSING"] = "processing";
    SessionStatus["ANALYZING"] = "analyzing";
    SessionStatus["COMPLETED"] = "completed";
    SessionStatus["FAILED"] = "failed";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
class AudioSessionError extends Error {
    constructor(message, code, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'AudioSessionError';
    }
}
exports.AudioSessionError = AudioSessionError;
class AudioSessionService {
    constructor(prisma, openaiService, s3Service, subscriptionService) {
        this.prisma = prisma;
        this.openaiService = openaiService;
        this.s3Service = s3Service;
        this.subscriptionService = subscriptionService;
    }
    async startSession(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true }
            });
            if (!user) {
                throw new AudioSessionError('User not found', 'USER_NOT_FOUND');
            }
            await this.subscriptionService.validateUsageLimit(userId);
            const now = new Date();
            const session = await this.prisma.audioSession.create({
                data: {
                    userId,
                    audioS3Key: '',
                    status: SessionStatus.PENDING,
                    displayName: (0, sessionDisplayName_1.formatSessionDisplayName)(now)
                }
            });
            return session;
        }
        catch (error) {
            if (error instanceof AudioSessionError) {
                throw error;
            }
            if (error instanceof SubscriptionService_1.SubscriptionError) {
                throw new AudioSessionError(error.message, error.code, error);
            }
            throw new AudioSessionError('Failed to create session', 'SESSION_CREATION_FAILED', error);
        }
    }
    async uploadAudio(sessionId, audioBuffer, filename = 'audio.wav') {
        try {
            const session = await this.prisma.audioSession.findUnique({
                where: { id: sessionId },
                include: {
                    user: {
                        include: { profile: true }
                    }
                }
            });
            if (!session) {
                throw new AudioSessionError('Session not found', 'SESSION_NOT_FOUND');
            }
            if (session.status !== SessionStatus.PENDING) {
                throw new AudioSessionError('Session is not in pending state', 'INVALID_SESSION_STATE');
            }
            await this.getProfileForUserOrThrow(session.userId);
            await this.prisma.audioSession.update({
                where: { id: sessionId },
                data: { status: SessionStatus.PROCESSING }
            });
            this.processAudioInMemory(sessionId, audioBuffer, filename, session).catch(error => {
                console.error(`Failed to process audio for session ${sessionId}:`, error);
                this.prisma.audioSession.update({
                    where: { id: sessionId },
                    data: { status: SessionStatus.FAILED }
                }).catch(updateError => {
                    console.error(`Failed to update session status:`, updateError);
                });
            });
        }
        catch (error) {
            if (error instanceof AudioSessionError) {
                throw error;
            }
            throw new AudioSessionError('Failed to upload audio', 'AUDIO_UPLOAD_FAILED', error);
        }
    }
    async processAudioInMemory(sessionId, audioBuffer, filename, session) {
        try {
            console.log(`Starting audio transcription for session ${sessionId}`);
            const transcriptionResult = await this.openaiService.transcribeAudio(audioBuffer, filename);
            await this.prisma.audioSession.update({
                where: { id: sessionId },
                data: { transcript: transcriptionResult.text }
            });
            console.log(`Transcription completed for session ${sessionId}`);
            const sanitizedFilename = (0, fileUpload_1.sanitizeFilename)(filename);
            const s3Key = `audio-sessions/${sessionId}/${Date.now()}-${sanitizedFilename}`;
            try {
                await this.s3Service.upload(s3Key, audioBuffer, { contentType: 'audio/wav' });
                console.log(`Audio uploaded to S3 for session ${sessionId}: ${s3Key}`);
                await this.prisma.audioSession.update({
                    where: { id: sessionId },
                    data: { audioS3Key: s3Key }
                });
            }
            catch (s3Error) {
                console.error(`Failed to upload audio to S3 for session ${sessionId}:`, s3Error);
            }
            if ((0, analysisQueue_1.isAsyncAnalysisEnabled)()) {
                try {
                    await this.prisma.audioSession.update({
                        where: { id: sessionId },
                        data: { status: SessionStatus.ANALYZING, processingError: null }
                    });
                    await (0, analysisQueue_1.enqueueSessionAnalysisJob)(sessionId);
                    console.log(`Queued AI analysis for session ${sessionId}`);
                }
                catch (queueError) {
                    const msg = queueError?.message || 'Failed to queue analysis';
                    await this.prisma.audioSession.update({
                        where: { id: sessionId },
                        data: { status: SessionStatus.FAILED, processingError: msg.slice(0, 500) }
                    });
                    throw queueError;
                }
                return;
            }
            await this.runAnalysisJob(sessionId);
            console.log(`Session ${sessionId} processing completed successfully`);
        }
        catch (error) {
            const errorMessage = error?.message || 'Processing failed';
            const processingError = errorMessage.length > 500 ? errorMessage.slice(0, 497) + '...' : errorMessage;
            await this.prisma.audioSession.update({
                where: { id: sessionId },
                data: { status: SessionStatus.FAILED, processingError }
            }).catch(() => { });
            if (error instanceof AudioSessionError) {
                throw error;
            }
            throw new AudioSessionError('Failed to process audio', 'AUDIO_PROCESSING_FAILED', error);
        }
    }
    async processAudio(sessionId) {
        try {
            const session = await this.prisma.audioSession.findUnique({
                where: { id: sessionId },
                include: {
                    user: {
                        include: { profile: true }
                    }
                }
            });
            if (!session) {
                throw new AudioSessionError('Session not found', 'SESSION_NOT_FOUND');
            }
            if (!session.audioS3Key) {
                throw new AudioSessionError('No audio file found for session', 'NO_AUDIO_FILE');
            }
            const audioBuffer = await this.s3Service.download(session.audioS3Key);
            const transcriptionResult = await this.openaiService.transcribeAudio(audioBuffer, `session-${sessionId}.wav`);
            await this.prisma.audioSession.update({
                where: { id: sessionId },
                data: { transcript: transcriptionResult.text }
            });
            if ((0, analysisQueue_1.isAsyncAnalysisEnabled)()) {
                await this.prisma.audioSession.update({
                    where: { id: sessionId },
                    data: { status: SessionStatus.ANALYZING, processingError: null }
                });
                await (0, analysisQueue_1.enqueueSessionAnalysisJob)(sessionId);
                return;
            }
            await this.runAnalysisJob(sessionId);
        }
        catch (error) {
            const errorMessage = error?.message || 'Processing failed';
            const processingError = errorMessage.length > 500 ? errorMessage.slice(0, 497) + '...' : errorMessage;
            await this.prisma.audioSession.update({
                where: { id: sessionId },
                data: { status: SessionStatus.FAILED, processingError }
            }).catch(() => { });
            if (error instanceof AudioSessionError) {
                throw error;
            }
            throw new AudioSessionError('Failed to process audio', 'AUDIO_PROCESSING_FAILED', error);
        }
    }
    async updateTranscriptAndReanalyze(sessionId, userId, input) {
        const session = await this.prisma.audioSession.findUnique({
            where: { id: sessionId },
            include: {
                user: {
                    include: { profile: true }
                }
            }
        });
        if (!session) {
            throw new AudioSessionError('Session not found', 'SESSION_NOT_FOUND');
        }
        if (session.userId !== userId) {
            throw new AudioSessionError('You do not have access to this session', 'SESSION_ACCESS_DENIED');
        }
        if (session.status !== SessionStatus.COMPLETED && session.status !== SessionStatus.FAILED) {
            throw new AudioSessionError('Session must be completed or failed to update transcript and re-analyze', 'INVALID_SESSION_STATE');
        }
        const transcript = typeof input === 'string'
            ? input
            : typeof input?.transcript === 'string' && input.transcript.trim().length > 0
                ? input.transcript
                : input?.conversation?.messages
                    ? (0, interviewConversation_1.serializeConversationToCanonicalTranscript)(input.conversation.messages, input.conversation.participants ?? (0, interviewConversation_1.buildDefaultParticipants)())
                    : '';
        if (!transcript || transcript.trim().length === 0) {
            throw new AudioSessionError('Transcript cannot be empty', 'VALIDATION_ERROR');
        }
        const hash = (0, transcriptHash_1.sha256Transcript)(transcript);
        const unchanged = session.transcript === transcript &&
            session.lastAnalyzedTranscriptHash === hash &&
            session.lastAnalysisPromptVersion === config_1.config.ANALYSIS_PROMPT_VERSION &&
            session.aiAnalysis != null;
        await this.prisma.audioSession.update({
            where: { id: sessionId },
            data: { transcript }
        });
        if (unchanged) {
            const existing = await this.getSession(sessionId);
            if (!existing) {
                throw new AudioSessionError('Failed to retrieve updated session', 'SESSION_RETRIEVAL_FAILED');
            }
            return existing;
        }
        const profile = await this.getProfileForUserOrThrow(session.userId);
        const pastSessionsSummary = await this.getPastSessionsSummary(session.userId, sessionId, 5);
        const userContext = {
            profile,
            targetRole: profile.targetIndustry && profile.targetJobTitle
                ? { industry: profile.targetIndustry, jobTitle: profile.targetJobTitle }
                : undefined,
            pastSessionsSummary: pastSessionsSummary || undefined
        };
        const { analysis, profileAiAttributes } = await this.openaiService.analyzeResponse(transcript, userContext, {
            sessionId
        });
        await this.updateSessionWithAnalysis(sessionId, analysis, {
            transcriptHash: hash,
            promptVersion: config_1.config.ANALYSIS_PROMPT_VERSION
        });
        await this.updateUserAIAttributes(session.userId, profileAiAttributes);
        await this.prisma.audioSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.COMPLETED }
        });
        const updated = await this.getSession(sessionId);
        if (!updated) {
            throw new AudioSessionError('Failed to retrieve updated session', 'SESSION_RETRIEVAL_FAILED');
        }
        return updated;
    }
    async updateSessionDisplayName(sessionId, userId, displayName) {
        const session = await this.prisma.audioSession.findUnique({
            where: { id: sessionId }
        });
        if (!session) {
            throw new AudioSessionError('Session not found', 'SESSION_NOT_FOUND');
        }
        if (session.userId !== userId) {
            throw new AudioSessionError('You do not have access to this session', 'SESSION_ACCESS_DENIED');
        }
        return this.prisma.audioSession.update({
            where: { id: sessionId },
            data: { displayName: displayName && displayName.trim() ? displayName.trim() : null }
        });
    }
    async getSession(sessionId) {
        try {
            const session = await this.prisma.audioSession.findUnique({
                where: { id: sessionId }
            });
            if (!session) {
                return null;
            }
            const aiAnalysis = session.aiAnalysis != null
                ? (0, sessionAiAnalysis_1.formatSessionAiAnalysisForClient)(session.aiAnalysis)
                : session.aiAnalysis;
            return {
                ...session,
                aiAnalysis: aiAnalysis,
                analysisComplete: session.status === SessionStatus.COMPLETED,
                processingError: session.processingError ?? (session.status === SessionStatus.FAILED ? 'Processing failed' : undefined)
            };
        }
        catch (error) {
            throw new AudioSessionError('Failed to get session', 'SESSION_RETRIEVAL_FAILED', error);
        }
    }
    async getSessionHistory(userId, limit = 20, statusFilter = 'completed') {
        try {
            const whereClause = { userId };
            if (statusFilter !== 'all') {
                whereClause.status = statusFilter;
            }
            const sessions = await this.prisma.audioSession.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit
            });
            return sessions;
        }
        catch (error) {
            throw new AudioSessionError('Failed to get session history', 'HISTORY_RETRIEVAL_FAILED', error);
        }
    }
    calculatePerformanceScores(analysis) {
        const { scores } = analysis;
        const clampScore = (score) => Math.max(1, Math.min(5, Math.round(score)));
        return {
            clarityScore: clampScore(scores.clarity),
            confidenceScore: clampScore(scores.confidence),
            toneScore: clampScore(scores.tone),
            enthusiasmScore: clampScore(scores.enthusiasm),
            specificityScore: clampScore(scores.specificity)
        };
    }
    async updateSessionWithAnalysis(sessionId, analysis, idempotency) {
        const scores = this.calculatePerformanceScores(analysis);
        await this.prisma.audioSession.update({
            where: { id: sessionId },
            data: {
                aiAnalysis: (0, sessionAiAnalysis_1.sanitizeAiAnalysisForPersistence)(analysis),
                ...scores,
                ...(idempotency
                    ? {
                        lastAnalyzedTranscriptHash: idempotency.transcriptHash,
                        lastAnalysisPromptVersion: idempotency.promptVersion
                    }
                    : {})
            }
        });
    }
    async runAnalysisJob(sessionId) {
        const session = await this.prisma.audioSession.findUnique({
            where: { id: sessionId },
            include: { user: { include: { profile: true } } }
        });
        if (!session) {
            console.error(`runAnalysisJob: session ${sessionId} not found`);
            return;
        }
        const transcript = session.transcript?.trim();
        if (!transcript) {
            await this.markSessionProcessingError(sessionId, 'Missing transcript for analysis');
            return;
        }
        const transcriptHash = (0, transcriptHash_1.sha256Transcript)(transcript);
        if (session.lastAnalyzedTranscriptHash === transcriptHash &&
            session.lastAnalysisPromptVersion === config_1.config.ANALYSIS_PROMPT_VERSION &&
            session.aiAnalysis != null) {
            await this.prisma.audioSession.update({
                where: { id: sessionId },
                data: { status: SessionStatus.COMPLETED, processingError: null }
            });
            return;
        }
        try {
            const profile = await this.getProfileForUserOrThrow(session.userId);
            const pastSessionsSummary = await this.getPastSessionsSummary(session.userId, sessionId, 5);
            const userContext = {
                profile,
                targetRole: profile.targetIndustry && profile.targetJobTitle
                    ? { industry: profile.targetIndustry, jobTitle: profile.targetJobTitle }
                    : undefined,
                pastSessionsSummary: pastSessionsSummary || undefined
            };
            console.log(`Starting AI analysis for session ${sessionId}`);
            const { analysis, profileAiAttributes } = await this.openaiService.analyzeResponse(transcript, userContext, { sessionId });
            await this.updateSessionWithAnalysis(sessionId, analysis, {
                transcriptHash,
                promptVersion: config_1.config.ANALYSIS_PROMPT_VERSION
            });
            await this.updateUserAIAttributes(session.userId, profileAiAttributes);
            await this.prisma.audioSession.update({
                where: { id: sessionId },
                data: { status: SessionStatus.COMPLETED, processingError: null }
            });
            await this.subscriptionService.incrementUsage(session.userId);
            console.log(`AI analysis completed for session ${sessionId}`);
        }
        catch (error) {
            const errorMessage = error?.message || 'Analysis failed';
            await this.markSessionProcessingError(sessionId, errorMessage);
            throw error;
        }
    }
    async markSessionProcessingError(sessionId, message) {
        const processingError = message.length > 500 ? message.slice(0, 497) + '...' : message;
        await this.prisma.audioSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.FAILED, processingError }
        });
    }
    async getProfileForUserOrThrow(userId) {
        const profile = await this.prisma.userProfile.findUnique({
            where: { userId }
        });
        if (!profile) {
            throw new AudioSessionError('Please create your profile first. Processing will be available after you complete your profile.', 'PROFILE_REQUIRED');
        }
        return profile;
    }
    async getPastSessionsSummary(userId, excludeSessionId, limit = 5) {
        const where = { userId, status: SessionStatus.COMPLETED };
        if (excludeSessionId) {
            where.id = { not: excludeSessionId };
        }
        const pastSessions = await this.prisma.audioSession.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        if (pastSessions.length === 0) {
            return '';
        }
        return pastSessions
            .map(s => {
            const date = s.createdAt.toISOString().split('T')[0];
            const scores = [s.clarityScore, s.confidenceScore, s.toneScore, s.enthusiasmScore, s.specificityScore]
                .filter((n) => n != null);
            const overall = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const insights = s.aiAnalysis?.insights != null && Array.isArray(s.aiAnalysis.insights)
                ? s.aiAnalysis.insights.slice(0, 2).join('; ')
                : 'N/A';
            return `- ${date}: overall ~${Math.round(overall)}, insights: ${insights}`;
        })
            .join('\n');
    }
    async updateUserAIAttributes(userId, newAttributes) {
        try {
            const profile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!profile) {
                await this.prisma.userProfile.create({
                    data: {
                        userId,
                        aiAttributes: newAttributes
                    }
                });
                return;
            }
            const currentAttributes = profile.aiAttributes || {};
            const mergedAttributes = { ...currentAttributes, ...newAttributes };
            await this.prisma.userProfile.update({
                where: { userId },
                data: { aiAttributes: mergedAttributes }
            });
        }
        catch (error) {
            console.error('Failed to update AI attributes:', error);
        }
    }
    async processAudioAsync(sessionId) {
        try {
            await this.processAudio(sessionId);
        }
        catch (error) {
            console.error(`Audio processing failed for session ${sessionId}:`, error);
            throw error;
        }
    }
}
exports.AudioSessionService = AudioSessionService;
//# sourceMappingURL=AudioSessionService.js.map