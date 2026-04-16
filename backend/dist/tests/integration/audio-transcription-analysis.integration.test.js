"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AudioSessionService_1 = require("../../src/services/AudioSessionService");
const S3Service_1 = require("../../src/services/S3Service");
const OpenAIService_1 = require("../../src/services/OpenAIService");
const SubscriptionService_1 = require("../../src/services/SubscriptionService");
const prisma_1 = __importDefault(require("../../src/lib/prisma"));
const testUserFactory_1 = require("./helpers/testUserFactory");
jest.mock('../../src/services/MonitoringService', () => {
    const mockMonitoringService = {
        recordAPICall: jest.fn(),
        recordError: jest.fn(),
        getMetrics: jest.fn().mockReturnValue({}),
        getHealthStatus: jest.fn().mockReturnValue({ status: 'healthy' }),
        collectSystemMetrics: jest.fn(),
        performHealthChecks: jest.fn(),
        cleanupOldMetrics: jest.fn(),
        cleanupOldAlerts: jest.fn(),
        addAlert: jest.fn(),
        checkForAlerts: jest.fn()
    };
    return {
        monitoringService: mockMonitoringService,
        MonitoringService: jest.fn().mockImplementation(() => mockMonitoringService)
    };
});
describe('Audio Transcription and Analysis Integration Tests', () => {
    let audioSessionService;
    let s3Service;
    let openaiService;
    let subscriptionService;
    let testUserId;
    let testAudioBuffer;
    beforeAll(async () => {
        const s3Config = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret',
            region: process.env.AWS_REGION || 'us-east-1',
            bucketName: process.env.AWS_S3_BUCKET || 'test-bucket'
        };
        s3Service = new S3Service_1.S3Service(s3Config);
        const openaiConfig = {
            gptApiKey: process.env.OPENAI_API_KEY || 'test-gpt-key',
            whisperApiKey: process.env.WHISPER_API_KEY || 'test-whisper-key',
            maxRetries: 3,
            timeout: 60000
        };
        openaiService = new OpenAIService_1.OpenAIService(openaiConfig);
        subscriptionService = new SubscriptionService_1.SubscriptionService(prisma_1.default);
        audioSessionService = new AudioSessionService_1.AudioSessionService(prisma_1.default, openaiService, s3Service, subscriptionService);
        const testUser = await (0, testUserFactory_1.createVerifiedUserWithProfile)('audio-test@example.com', 'Password123!');
        testUserId = testUser.id;
        await prisma_1.default.userProfile.update({
            where: { userId: testUserId },
            data: {
                targetIndustry: 'Technology',
                targetJobTitle: 'Software Engineer',
                experienceLevel: 'mid',
                extractedSkills: ['JavaScript', 'TypeScript', 'React']
            }
        });
        testAudioBuffer = createTestAudioBuffer();
    });
    afterAll(async () => {
        try {
            const sessions = await prisma_1.default.audioSession.findMany({
                where: { userId: testUserId }
            });
            for (const session of sessions) {
                if (session.audioS3Key) {
                    try {
                        await s3Service.deleteFile(session.audioS3Key);
                    }
                    catch (error) {
                        console.warn('Failed to delete test audio from S3:', error);
                    }
                }
            }
            await prisma_1.default.audioSession.deleteMany({
                where: { userId: testUserId }
            });
            await prisma_1.default.userProfile.deleteMany({
                where: { userId: testUserId }
            });
            await prisma_1.default.user.deleteMany({
                where: { email: 'audio-test@example.com' }
            });
        }
        catch (error) {
            console.error('Cleanup error:', error);
        }
        await prisma_1.default.$disconnect();
    });
    describe('End-to-End Audio Transcription and Analysis', () => {
        it('should successfully upload audio, transcribe, analyze, and update session', async () => {
            const session = await audioSessionService.startSession(testUserId);
            expect(session).toBeDefined();
            expect(session.userId).toBe(testUserId);
            expect(session.status).toBe('pending');
            await audioSessionService.uploadAudio(session.id, testAudioBuffer, 'test-audio.wav');
            let updatedSession = await audioSessionService.getSession(session.id);
            expect(updatedSession?.audioS3Key).toBeDefined();
            expect(updatedSession?.audioS3Key).toContain('audio-sessions/');
            expect(updatedSession?.audioS3Key).toContain(session.id);
            expect(updatedSession?.status).toBe('processing');
            const fileExists = await s3Service.fileExists(updatedSession.audioS3Key);
            expect(fileExists).toBe(true);
            await new Promise(resolve => setTimeout(resolve, 10000));
            updatedSession = await audioSessionService.getSession(session.id);
            expect(updatedSession?.transcript).toBeDefined();
            expect(updatedSession?.transcript).not.toBe('');
            expect(typeof updatedSession?.transcript).toBe('string');
            expect(updatedSession?.aiAnalysis).toBeDefined();
            const aiAnalysis = updatedSession?.aiAnalysis;
            expect(Array.isArray(aiAnalysis?.strengthAreas)).toBe(true);
            expect(Array.isArray(aiAnalysis?.strengthInsights)).toBe(true);
            expect(Array.isArray(aiAnalysis?.opportunityAreas)).toBe(true);
            expect(Array.isArray(aiAnalysis?.opportunityInsights)).toBe(true);
            expect(Array.isArray(aiAnalysis?.topTraits)).toBe(true);
            expect(updatedSession?.clarityScore).toBeDefined();
            expect(updatedSession?.confidenceScore).toBeDefined();
            expect(updatedSession?.toneScore).toBeDefined();
            expect(updatedSession?.enthusiasmScore).toBeDefined();
            expect(updatedSession?.specificityScore).toBeDefined();
            expect(updatedSession?.clarityScore).toBeGreaterThanOrEqual(1);
            expect(updatedSession?.clarityScore).toBeLessThanOrEqual(5);
            expect(updatedSession?.confidenceScore).toBeGreaterThanOrEqual(1);
            expect(updatedSession?.confidenceScore).toBeLessThanOrEqual(5);
            expect(updatedSession?.status).toBe('completed');
            expect(updatedSession?.analysisComplete).toBe(true);
            const profile = await prisma_1.default.userProfile.findUnique({
                where: { userId: testUserId }
            });
            expect(profile?.aiAttributes).toBeDefined();
        }, 60000);
        it('should handle multiple sessions for the same user', async () => {
            const session1 = await audioSessionService.startSession(testUserId);
            await audioSessionService.uploadAudio(session1.id, testAudioBuffer, 'audio1.wav');
            const session2 = await audioSessionService.startSession(testUserId);
            await audioSessionService.uploadAudio(session2.id, testAudioBuffer, 'audio2.wav');
            await new Promise(resolve => setTimeout(resolve, 10000));
            const updatedSession1 = await audioSessionService.getSession(session1.id);
            const updatedSession2 = await audioSessionService.getSession(session2.id);
            expect(updatedSession1?.status).toBe('completed');
            expect(updatedSession2?.status).toBe('completed');
            expect(updatedSession1?.audioS3Key).not.toBe(updatedSession2?.audioS3Key);
            const history = await audioSessionService.getSessionHistory(testUserId);
            expect(history.length).toBeGreaterThanOrEqual(2);
        }, 60000);
        it('should include user context in GPT analysis', async () => {
            const session = await audioSessionService.startSession(testUserId);
            await audioSessionService.uploadAudio(session.id, testAudioBuffer, 'context-test.wav');
            await new Promise(resolve => setTimeout(resolve, 10000));
            const updatedSession = await audioSessionService.getSession(session.id);
            expect(updatedSession?.aiAnalysis).toBeDefined();
            expect(updatedSession?.status).toBe('completed');
        }, 60000);
        it('should handle session not found error', async () => {
            const nonExistentSessionId = '00000000-0000-0000-0000-000000000000';
            const session = await audioSessionService.getSession(nonExistentSessionId);
            expect(session).toBeNull();
        });
        it('should handle invalid session state for audio upload', async () => {
            const session = await audioSessionService.startSession(testUserId);
            await audioSessionService.uploadAudio(session.id, testAudioBuffer, 'first-upload.wav');
            await expect(audioSessionService.uploadAudio(session.id, testAudioBuffer, 'second-upload.wav')).rejects.toThrow('Session is not in pending state');
        });
        it('should retrieve session history with correct ordering', async () => {
            const session1 = await audioSessionService.startSession(testUserId);
            await new Promise(resolve => setTimeout(resolve, 100));
            const session2 = await audioSessionService.startSession(testUserId);
            await new Promise(resolve => setTimeout(resolve, 100));
            const session3 = await audioSessionService.startSession(testUserId);
            const history = await audioSessionService.getSessionHistory(testUserId, 10);
            expect(history.length).toBeGreaterThanOrEqual(3);
            expect(history[0].id).toBe(session3.id);
            expect(history[1].id).toBe(session2.id);
            expect(history[2].id).toBe(session1.id);
        });
        it('should limit session history results', async () => {
            const history = await audioSessionService.getSessionHistory(testUserId, 2);
            expect(history.length).toBeLessThanOrEqual(2);
        });
    });
    describe('Audio Processing Error Handling', () => {
        it('should handle transcription failures gracefully', async () => {
            const failingOpenAIService = {
                transcribeAudio: jest.fn().mockRejectedValue(new Error('Whisper API failed')),
                analyzeResponse: jest.fn()
            };
            const testAudioService = new AudioSessionService_1.AudioSessionService(prisma_1.default, failingOpenAIService, s3Service, subscriptionService);
            const testUser2 = await (0, testUserFactory_1.createVerifiedUserWithProfile)('audio-test2@example.com', 'Password123!');
            const testUserId2 = testUser2.id;
            try {
                const session = await testAudioService.startSession(testUserId2);
                await testAudioService.uploadAudio(session.id, testAudioBuffer, 'fail-test.wav');
                await new Promise(resolve => setTimeout(resolve, 5000));
                const updatedSession = await testAudioService.getSession(session.id);
                expect(updatedSession?.status).toBe('failed');
                await prisma_1.default.audioSession.deleteMany({ where: { userId: testUserId2 } });
                await prisma_1.default.userProfile.deleteMany({ where: { userId: testUserId2 } });
                await prisma_1.default.user.deleteMany({ where: { email: 'audio-test2@example.com' } });
            }
            catch (error) {
                await prisma_1.default.audioSession.deleteMany({ where: { userId: testUserId2 } });
                await prisma_1.default.userProfile.deleteMany({ where: { userId: testUserId2 } });
                await prisma_1.default.user.deleteMany({ where: { email: 'audio-test2@example.com' } });
                throw error;
            }
        }, 30000);
    });
});
function createTestAudioBuffer() {
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const duration = 2;
    const numSamples = sampleRate * duration;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    const frequency = 440;
    for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
        const value = Math.round(sample * 32767 * 0.5);
        buffer.writeInt16LE(value, 44 + i * 2);
    }
    return buffer;
}
//# sourceMappingURL=audio-transcription-analysis.integration.test.js.map