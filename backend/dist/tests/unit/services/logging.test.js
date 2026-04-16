"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OpenAIService_1 = require("../../../src/services/OpenAIService");
const S3Service_1 = require("../../../src/services/S3Service");
const ErrorHandlingService_1 = require("../../../src/services/ErrorHandlingService");
process.env.OPENAI_API_KEY = 'test-gpt-api-key';
process.env.WHISPER_API_KEY = 'test-whisper-api-key';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';
describe('Comprehensive Logging for External API Calls', () => {
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;
    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });
    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
    describe('OpenAI Service Logging', () => {
        let openaiService;
        beforeEach(() => {
            openaiService = new OpenAIService_1.OpenAIService({
                gptApiKey: 'test-gpt-api-key',
                whisperApiKey: 'test-whisper-api-key',
                maxRetries: 2,
                timeout: 30000
            });
        });
        describe('Requirement 8.1: Log operation type, timestamp, and request ID before calls', () => {
            it('should log before transcribeAudio API call', async () => {
                const audioBuffer = Buffer.alloc(2048, 'test audio data');
                const filename = 'test-audio.wav';
                const mockError = new Error('Mock error for testing');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockRejectedValueOnce(mockError);
                try {
                    await openaiService.transcribeAudio(audioBuffer, filename);
                }
                catch (error) {
                }
                expect(consoleLogSpy).toHaveBeenCalledWith('Starting OpenAI Whisper API call', expect.objectContaining({
                    operationType: 'whisper_transcription',
                    timestamp: expect.any(String),
                    requestId: expect.stringMatching(/^transcribe_audio_\d+$/),
                    filename,
                    bufferSize: audioBuffer.length
                }));
            });
            it('should log before analyzeResponse API call', async () => {
                const transcript = 'This is a test transcript for analysis';
                const userContext = {
                    profile: {
                        id: 'profile-1',
                        userId: 'user-1',
                        fullName: null,
                        currentJobTitle: null,
                        currentCompany: null,
                        school: null,
                        degreeInfo: null,
                        previousJobTitles: [],
                        targetIndustry: 'Technology',
                        targetJobTitle: 'Software Engineer',
                        aiAttributes: {},
                        extractedSkills: ['JavaScript'],
                        experienceLevel: 'Mid',
                        resumeS3Key: null,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                };
                const mockError = new Error('Mock error for testing');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockRejectedValueOnce(mockError);
                try {
                    await openaiService.analyzeResponse(transcript, userContext);
                }
                catch (error) {
                }
                expect(consoleLogSpy).toHaveBeenCalledWith('Starting OpenAI GPT API call for response analysis', expect.objectContaining({
                    operationType: 'gpt_analysis',
                    timestamp: expect.any(String),
                    requestId: expect.stringMatching(/^analyze_response_\d+$/),
                    transcriptLength: transcript.length,
                    userId: userContext.profile.id
                }));
            });
            it('should log before extractResumeData API call', async () => {
                const resumeText = 'This is a test resume with skills like JavaScript and Python';
                const mockError = new Error('Mock error for testing');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockRejectedValueOnce(mockError);
                try {
                    await openaiService.extractResumeData(resumeText);
                }
                catch (error) {
                }
                expect(consoleLogSpy).toHaveBeenCalledWith('Starting OpenAI GPT API call for resume extraction', expect.objectContaining({
                    operationType: 'gpt_resume_extraction',
                    timestamp: expect.any(String),
                    requestId: expect.stringMatching(/^extract_resume_\d+$/),
                    resumeTextLength: resumeText.length
                }));
            });
        });
        describe('Requirement 8.2: Log response time and metadata on success', () => {
            it('should log success with response time for transcribeAudio', async () => {
                const audioBuffer = Buffer.alloc(2048, 'test audio data');
                const mockResult = {
                    text: 'Test transcription',
                    language: 'en',
                    duration: 10
                };
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockResolvedValueOnce(mockResult);
                await openaiService.transcribeAudio(audioBuffer, 'test.wav');
                expect(consoleLogSpy).toHaveBeenCalledWith('OpenAI Whisper API call succeeded', expect.objectContaining({
                    operationType: 'whisper_transcription',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    metadata: expect.objectContaining({
                        textLength: mockResult.text.length,
                        language: mockResult.language,
                        duration: mockResult.duration
                    })
                }));
            });
            it('should log success with response time for analyzeResponse', async () => {
                const transcript = 'Test transcript';
                const userContext = {
                    profile: {
                        id: 'profile-1',
                        userId: 'user-1',
                        fullName: null,
                        currentJobTitle: null,
                        currentCompany: null,
                        school: null,
                        degreeInfo: null,
                        previousJobTitles: [],
                        targetIndustry: 'Technology',
                        targetJobTitle: 'Software Engineer',
                        aiAttributes: {},
                        extractedSkills: ['JavaScript'],
                        experienceLevel: 'Mid',
                        resumeS3Key: null,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                };
                const mockResult = {
                    analysis: {
                        analysisVersion: 2,
                        feedback: 'Good response',
                        scores: {
                            clarity: 4,
                            confidence: 4,
                            tone: 5,
                            enthusiasm: 4,
                            specificity: 4
                        },
                        insights: ['Good example', 'Clear structure'],
                        strengthAreas: ['technical', 'communication'],
                        strengthInsights: ['Clear communicator', 'Technical depth'],
                        opportunityAreas: ['structure', 'examples'],
                        opportunityInsights: ['Could add more specific examples', 'Consider clarifying scope or constraints'],
                        topTraits: ['Clear communicator', 'Technical depth'],
                        participants: {
                            candidate: { id: 'candidate' },
                            interviewers: [{ id: 'interviewer_1' }]
                        },
                        messages: [
                            {
                                id: 'm1',
                                role: 'interviewer',
                                speakerId: 'interviewer_1',
                                text: 'Q?',
                                edited: { isEdited: false, editedText: '' }
                            },
                            {
                                id: 'm2',
                                role: 'candidate',
                                speakerId: 'candidate',
                                text: 'A.',
                                edited: { isEdited: false, editedText: '' },
                                feedback: { flag: 'Good' }
                            }
                        ]
                    },
                    profileAiAttributes: { communicationStyle: 'balanced' }
                };
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockResolvedValueOnce(mockResult);
                await openaiService.analyzeResponse(transcript, userContext);
                expect(consoleLogSpy).toHaveBeenCalledWith('OpenAI GPT API call for response analysis succeeded', expect.objectContaining({
                    operationType: 'gpt_analysis',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    metadata: expect.objectContaining({
                        feedbackLength: mockResult.analysis.feedback.length,
                        insightsCount: mockResult.analysis.insights.length,
                        averageScore: expect.any(Number)
                    })
                }));
            });
        });
        describe('Requirement 8.3: Log error code, message, and context on failure', () => {
            it('should log error details for transcribeAudio failure', async () => {
                const audioBuffer = Buffer.alloc(2048, 'test audio data');
                const mockError = new Error('API rate limit exceeded');
                mockError.code = 'rate_limit_exceeded';
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockRejectedValueOnce(mockError);
                try {
                    await openaiService.transcribeAudio(audioBuffer, 'test.wav');
                }
                catch (error) {
                }
                expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI Whisper API call failed', expect.objectContaining({
                    operationType: 'whisper_transcription',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    errorCode: 'rate_limit_exceeded',
                    errorMessage: 'API rate limit exceeded',
                    errorContext: expect.objectContaining({
                        filename: 'test.wav',
                        bufferSize: audioBuffer.length,
                        errorType: 'Error'
                    })
                }));
            });
            it('should log error details for analyzeResponse failure', async () => {
                const transcript = 'Test transcript';
                const userContext = {
                    profile: {
                        id: 'profile-1',
                        userId: 'user-1',
                        fullName: null,
                        currentJobTitle: null,
                        currentCompany: null,
                        school: null,
                        degreeInfo: null,
                        previousJobTitles: [],
                        targetIndustry: 'Technology',
                        targetJobTitle: 'Software Engineer',
                        aiAttributes: {},
                        extractedSkills: ['JavaScript'],
                        experienceLevel: 'Mid',
                        resumeS3Key: null,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                };
                const mockError = new Error('Invalid API key');
                mockError.code = 'invalid_api_key';
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockRejectedValueOnce(mockError);
                try {
                    await openaiService.analyzeResponse(transcript, userContext);
                }
                catch (error) {
                }
                expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI GPT API call for response analysis failed', expect.objectContaining({
                    operationType: 'gpt_analysis',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    errorCode: 'invalid_api_key',
                    errorMessage: 'Invalid API key',
                    errorContext: expect.objectContaining({
                        transcriptLength: transcript.length,
                        userId: userContext.profile.id,
                        errorType: 'Error'
                    })
                }));
            });
        });
        describe('Requirement 8.4: Log when fallback logic is triggered', () => {
            it('should throw when Whisper retries exhausted (no placeholder transcript)', async () => {
                const audioBuffer = Buffer.alloc(2048, 'test audio data');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockImplementationOnce(async () => {
                    throw new Error('Whisper API failed');
                });
                await expect(openaiService.transcribeAudio(audioBuffer, 'test.wav')).rejects.toThrow();
            });
        });
    });
    describe('S3 Service Logging', () => {
        let s3Service;
        beforeEach(() => {
            s3Service = new S3Service_1.S3Service({
                accessKeyId: 'test-access-key',
                secretAccessKey: 'test-secret-key',
                region: 'us-east-1',
                bucketName: 'test-bucket'
            });
        });
        describe('Requirement 8.1: Log operation type, timestamp, and request ID before calls', () => {
            it('should log before S3 upload operation', async () => {
                const key = 'test-file.txt';
                const buffer = Buffer.from('test content');
                const mockError = new Error('Mock S3 error');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockRejectedValueOnce(mockError);
                try {
                    await s3Service.upload(key, buffer);
                }
                catch (error) {
                }
                expect(consoleLogSpy).toHaveBeenCalledWith('Starting S3 upload operation', expect.objectContaining({
                    operationType: 's3_upload',
                    timestamp: expect.any(String),
                    requestId: expect.stringMatching(/^s3_upload_.*_\d+$/),
                    key,
                    bufferSize: buffer.length
                }));
            });
            it('should log before S3 download operation', async () => {
                const key = 'test-file.txt';
                const mockError = new Error('Mock S3 error');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockRejectedValueOnce(mockError);
                try {
                    await s3Service.download(key);
                }
                catch (error) {
                }
                expect(consoleLogSpy).toHaveBeenCalledWith('Starting S3 download operation', expect.objectContaining({
                    operationType: 's3_download',
                    timestamp: expect.any(String),
                    requestId: expect.stringMatching(/^s3_download_.*_\d+$/),
                    key
                }));
            });
            it('should log before S3 signed URL generation', async () => {
                const key = 'test-file.txt';
                const expiresIn = 3600;
                const mockError = new Error('Mock S3 error');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockRejectedValueOnce(mockError);
                try {
                    await s3Service.getSignedUrl(key, expiresIn);
                }
                catch (error) {
                }
                expect(consoleLogSpy).toHaveBeenCalledWith('Starting S3 signed URL generation', expect.objectContaining({
                    operationType: 's3_get_signed_url',
                    timestamp: expect.any(String),
                    requestId: expect.stringMatching(/^s3_signed_url_.*_\d+$/),
                    key,
                    expiresIn
                }));
            });
            it('should log before S3 upload URL generation', async () => {
                const key = 'test-file.txt';
                const options = {
                    contentType: 'text/plain',
                    expiresIn: 3600
                };
                const mockError = new Error('Mock S3 error');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockRejectedValueOnce(mockError);
                try {
                    await s3Service.generateUploadUrl(key, options);
                }
                catch (error) {
                }
                expect(consoleLogSpy).toHaveBeenCalledWith('Starting S3 upload URL generation', expect.objectContaining({
                    operationType: 's3_generate_upload_url',
                    timestamp: expect.any(String),
                    requestId: expect.stringMatching(/^s3_upload_url_.*_\d+$/),
                    key,
                    contentType: options.contentType,
                    expiresIn: options.expiresIn
                }));
            });
        });
        describe('Requirement 8.2: Log response time and metadata on success', () => {
            it('should log success with response time for S3 upload', async () => {
                const key = 'test-file.txt';
                const buffer = Buffer.from('test content');
                const mockLocation = 'https://s3.amazonaws.com/test-bucket/test-file.txt';
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockResolvedValueOnce(mockLocation);
                await s3Service.upload(key, buffer);
                expect(consoleLogSpy).toHaveBeenCalledWith('S3 upload operation succeeded', expect.objectContaining({
                    operationType: 's3_upload',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    metadata: expect.objectContaining({
                        key,
                        location: mockLocation,
                        bufferSize: buffer.length
                    })
                }));
            });
            it('should log success with response time for S3 download', async () => {
                const key = 'test-file.txt';
                const mockBuffer = Buffer.from('downloaded content');
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockResolvedValueOnce(mockBuffer);
                await s3Service.download(key);
                expect(consoleLogSpy).toHaveBeenCalledWith('S3 download operation succeeded', expect.objectContaining({
                    operationType: 's3_download',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    metadata: expect.objectContaining({
                        key,
                        bufferSize: mockBuffer.length
                    })
                }));
            });
        });
        describe('Requirement 8.3: Log error code, message, and context on failure', () => {
            it('should log error details for S3 upload failure', async () => {
                const key = 'test-file.txt';
                const buffer = Buffer.from('test content');
                const mockError = new Error('Access denied');
                mockError.code = 'AccessDenied';
                mockError.statusCode = 403;
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockRejectedValueOnce(mockError);
                try {
                    await s3Service.upload(key, buffer);
                }
                catch (error) {
                }
                expect(consoleErrorSpy).toHaveBeenCalledWith('S3 upload operation failed', expect.objectContaining({
                    operationType: 's3_upload',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    errorCode: 'AccessDenied',
                    errorMessage: 'Access denied',
                    errorContext: expect.objectContaining({
                        key,
                        bufferSize: buffer.length,
                        errorType: 'Error'
                    })
                }));
            });
            it('should log error details for S3 download failure', async () => {
                const key = 'non-existent-file.txt';
                const mockError = new Error('The specified key does not exist');
                mockError.code = 'NoSuchKey';
                mockError.statusCode = 404;
                jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeS3Operation').mockRejectedValueOnce(mockError);
                try {
                    await s3Service.download(key);
                }
                catch (error) {
                }
                expect(consoleErrorSpy).toHaveBeenCalledWith('S3 download operation failed', expect.objectContaining({
                    operationType: 's3_download',
                    requestId: expect.any(String),
                    responseTimeMs: expect.any(Number),
                    errorCode: 'NoSuchKey',
                    errorMessage: 'The specified key does not exist',
                    errorContext: expect.objectContaining({
                        key,
                        errorType: 'Error'
                    })
                }));
            });
        });
    });
    describe('Logging Format Validation', () => {
        it('should include ISO 8601 timestamp format', async () => {
            const openaiService = new OpenAIService_1.OpenAIService();
            const audioBuffer = Buffer.alloc(2048, 'test');
            const mockError = new Error('Test error');
            jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockRejectedValueOnce(mockError);
            try {
                await openaiService.transcribeAudio(audioBuffer, 'test.wav');
            }
            catch (error) {
            }
            const logCall = consoleLogSpy.mock.calls.find(call => call[0] === 'Starting OpenAI Whisper API call');
            expect(logCall).toBeDefined();
            const logData = logCall[1];
            expect(logData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
        it('should include unique request IDs', async () => {
            const openaiService = new OpenAIService_1.OpenAIService();
            const audioBuffer = Buffer.alloc(2048, 'test');
            const mockError = new Error('Test error');
            jest.spyOn(ErrorHandlingService_1.errorHandlingService, 'executeOpenAIOperation').mockRejectedValue(mockError);
            try {
                await openaiService.transcribeAudio(audioBuffer, 'test1.wav');
            }
            catch (error) {
            }
            await new Promise(resolve => setTimeout(resolve, 2));
            try {
                await openaiService.transcribeAudio(audioBuffer, 'test2.wav');
            }
            catch (error) {
            }
            const logCalls = consoleLogSpy.mock.calls.filter(call => call[0] === 'Starting OpenAI Whisper API call');
            expect(logCalls.length).toBeGreaterThanOrEqual(2);
            const requestId1 = logCalls[0][1].requestId;
            const requestId2 = logCalls[1][1].requestId;
            expect(requestId1).toMatch(/^transcribe_audio_\d+$/);
            expect(requestId2).toMatch(/^transcribe_audio_\d+$/);
            expect(requestId1).not.toBe(requestId2);
        });
    });
});
//# sourceMappingURL=logging.test.js.map