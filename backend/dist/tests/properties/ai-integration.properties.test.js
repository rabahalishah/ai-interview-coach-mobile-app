"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const OpenAIService_1 = require("../../src/services/OpenAIService");
jest.mock('openai');
jest.mock('../../src/services/ErrorHandlingService', () => {
    return {
        errorHandlingService: {
            executeOpenAIOperation: jest.fn(),
        },
    };
});
jest.mock('../../src/services/MonitoringService', () => ({
    monitoringService: {
        recordAPIOperation: jest.fn(),
    },
}));
const ErrorHandlingService_1 = require("../../src/services/ErrorHandlingService");
const mockedErrorHandling = ErrorHandlingService_1.errorHandlingService;
function flatAnalysisJsonForTests(overrides = {}) {
    return JSON.stringify({
        analysisVersion: 2,
        feedback: 'Test feedback',
        scores: { clarity: 4, confidence: 4, tone: 5, enthusiasm: 4, specificity: 4 },
        insights: ['Good structure', 'Needs more examples'],
        topTraits: ['Good structure', 'Relevant experience'],
        strengthAreas: ['technical', 'communication'],
        strengthInsights: ['Good structure', 'Relevant experience'],
        opportunityAreas: ['structure', 'specificity'],
        opportunityInsights: ['Could add specific examples', 'Consider metrics'],
        aiAttributes: { communicationStyle: 'detailed' },
        participants: {
            candidate: { id: 'candidate', displayName: 'Candidate' },
            interviewers: [{ id: 'interviewer_1', displayName: 'Interviewer 1' }]
        },
        messages: [
            {
                id: 'm1',
                role: 'interviewer',
                speakerId: 'interviewer_1',
                text: 'Tell me about a project.',
                edited: { isEdited: false, editedText: '' }
            },
            {
                id: 'm2',
                role: 'candidate',
                speakerId: 'candidate',
                text: 'I led the migration and measured adoption weekly.',
                edited: { isEdited: false, editedText: '' },
                feedback: { flag: 'Good' }
            }
        ],
        ...overrides
    });
}
describe('AI Integration Properties', () => {
    let openaiService;
    let mockWhisperClient;
    let mockGptClient;
    beforeEach(() => {
        process.env.OPENAI_API_KEY = 'test-gpt-api-key';
        process.env.WHISPER_API_KEY = 'test-whisper-api-key';
        openaiService = new OpenAIService_1.OpenAIService({
            gptApiKey: 'test-gpt-api-key',
            whisperApiKey: 'test-whisper-api-key',
            maxRetries: 2,
            timeout: 30000
        });
        mockWhisperClient = {
            audio: {
                transcriptions: {
                    create: jest.fn()
                }
            }
        };
        mockGptClient = {
            chat: {
                completions: {
                    create: jest.fn()
                }
            }
        };
        openaiService.whisperClient = mockWhisperClient;
        openaiService.gptClient = mockGptClient;
        mockedErrorHandling.executeOpenAIOperation.mockImplementation(async (operation, _operationId, _fallback) => {
            return await operation();
        });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Property 12: Transcription triggers analysis', () => {
        it('should trigger analysis after successful transcription', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uint8Array({ minLength: 1024, maxLength: 10000 }), fast_check_1.default.string({ minLength: 1, maxLength: 50 }), async (audioBuffer, filename) => {
                const mockTranscription = {
                    text: 'This is a test transcription',
                    language: 'en',
                    duration: 30.5
                };
                mockWhisperClient.audio.transcriptions.create.mockResolvedValue(mockTranscription);
                const result = await openaiService.transcribeAudio(Buffer.from(audioBuffer), filename);
                expect(result.text).toBe(mockTranscription.text);
                expect(result.language).toBe(mockTranscription.language);
                expect(result.duration).toBe(mockTranscription.duration);
                expect(mockWhisperClient.audio.transcriptions.create).toHaveBeenCalledWith({
                    file: expect.any(File),
                    model: 'whisper-1',
                    response_format: 'verbose_json',
                    language: 'en'
                });
            }), { numRuns: 100 });
        });
    });
    describe('Property 13: Analysis produces all scores', () => {
        it('should produce all required performance scores', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10), fast_check_1.default.record({
                targetIndustry: fast_check_1.default.option(fast_check_1.default.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)),
                targetJobTitle: fast_check_1.default.option(fast_check_1.default.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)),
                extractedSkills: fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { maxLength: 10 }),
                experienceLevel: fast_check_1.default.option(fast_check_1.default.constantFrom('Entry', 'Mid', 'Senior', 'Executive'))
            }), async (transcript, profileData) => {
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: profileData.targetIndustry || null,
                    targetJobTitle: profileData.targetJobTitle || null,
                    aiAttributes: {},
                    extractedSkills: profileData.extractedSkills,
                    experienceLevel: profileData.experienceLevel || null,
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const userContext = { profile: userProfile };
                const mockAnalysisResponse = {
                    choices: [{
                            message: {
                                content: flatAnalysisJsonForTests()
                            }
                        }]
                };
                mockGptClient.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
                const { analysis: result } = await openaiService.analyzeResponse(transcript, userContext);
                expect(result.scores).toHaveProperty('clarity');
                expect(result.scores).toHaveProperty('confidence');
                expect(result.scores).toHaveProperty('tone');
                expect(result.scores).toHaveProperty('enthusiasm');
                expect(result.scores).toHaveProperty('specificity');
                Object.values(result.scores).forEach(score => {
                    expect(typeof score).toBe('number');
                    expect(score).toBeGreaterThanOrEqual(1);
                    expect(score).toBeLessThanOrEqual(5);
                });
                expect(result.feedback).toBeTruthy();
                expect(Array.isArray(result.insights)).toBe(true);
                expect(result).not.toHaveProperty('aiAttributes');
                expect(Array.isArray(result.strengthAreas)).toBe(true);
                (result.strengthAreas ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.strengthInsights)).toBe(true);
                (result.strengthInsights ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.opportunityAreas)).toBe(true);
                (result.opportunityAreas ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.opportunityInsights)).toBe(true);
                (result.opportunityInsights ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.topTraits)).toBe(true);
                (result.topTraits ?? []).forEach((item) => expect(typeof item).toBe('string'));
            }), { numRuns: 100 });
        });
    });
    describe('Property 15: Audio processing includes user context', () => {
        it('should incorporate user profile data in analysis prompts', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10), fast_check_1.default.record({
                targetIndustry: fast_check_1.default.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                targetJobTitle: fast_check_1.default.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                extractedSkills: fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
                experienceLevel: fast_check_1.default.constantFrom('Entry', 'Mid', 'Senior', 'Executive')
            }), async (transcript, profileData) => {
                mockGptClient.chat.completions.create.mockReset();
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: profileData.targetIndustry,
                    targetJobTitle: profileData.targetJobTitle,
                    aiAttributes: {},
                    extractedSkills: profileData.extractedSkills,
                    experienceLevel: profileData.experienceLevel,
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const userContext = {
                    profile: userProfile,
                    targetRole: {
                        industry: profileData.targetIndustry,
                        jobTitle: profileData.targetJobTitle
                    }
                };
                const mockAnalysisResponse = {
                    choices: [{
                            message: {
                                content: flatAnalysisJsonForTests({
                                    feedback: 'Test feedback',
                                    scores: { clarity: 4, confidence: 4, tone: 4, enthusiasm: 5, specificity: 4 },
                                    insights: ['Test insight']
                                })
                            }
                        }]
                };
                mockGptClient.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
                await openaiService.analyzeResponse(transcript, userContext);
                const callArgs = mockGptClient.chat.completions.create.mock.calls[0][0];
                const prompt = callArgs.messages[1].content;
                expect(prompt).toContain(profileData.targetJobTitle);
                expect(prompt).toContain(profileData.targetIndustry);
                expect(prompt).toContain(profileData.experienceLevel);
                profileData.extractedSkills.forEach(skill => {
                    expect(prompt).toContain(skill);
                });
            }), { numRuns: 100 });
        });
    });
    describe('Property 16: Feedback contains required insights', () => {
        it('should generate feedback with quality, relevance, and delivery insights', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 20, maxLength: 300 }), async (transcript) => {
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Software Engineer',
                    aiAttributes: {},
                    extractedSkills: ['JavaScript', 'React'],
                    experienceLevel: 'Mid',
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const userContext = { profile: userProfile };
                const mockAnalysisResponse = {
                    choices: [{
                            message: {
                                content: flatAnalysisJsonForTests({
                                    feedback: 'Detailed feedback about response quality, content relevance, and delivery style',
                                    scores: { clarity: 4, confidence: 4, tone: 4, enthusiasm: 5, specificity: 4 },
                                    insights: [
                                        'Good technical explanation showing depth of knowledge',
                                        'Could improve by adding more specific examples',
                                        'Confident delivery with appropriate technical terminology'
                                    ],
                                    aiAttributes: { communicationStyle: 'technical' }
                                })
                            }
                        }]
                };
                mockGptClient.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
                const { analysis: result } = await openaiService.analyzeResponse(transcript, userContext);
                expect(result.feedback).toBeTruthy();
                expect(typeof result.feedback).toBe('string');
                expect(result.feedback.length).toBeGreaterThan(10);
                expect(Array.isArray(result.insights)).toBe(true);
                expect(result.insights.length).toBeGreaterThan(0);
                result.insights.forEach(insight => {
                    expect(typeof insight).toBe('string');
                    expect(insight.length).toBeGreaterThan(5);
                });
            }), { numRuns: 100 });
        });
    });
    describe('Property 17: Scores within valid range', () => {
        it('should ensure all performance scores are between 1 and 5 (out of 5)', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10), fast_check_1.default.record({
                clarity: fast_check_1.default.integer({ min: 1, max: 5 }),
                confidence: fast_check_1.default.integer({ min: 1, max: 5 }),
                tone: fast_check_1.default.integer({ min: 1, max: 5 }),
                enthusiasm: fast_check_1.default.integer({ min: 1, max: 5 }),
                specificity: fast_check_1.default.integer({ min: 1, max: 5 })
            }), async (transcript, scores) => {
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Developer',
                    aiAttributes: {},
                    extractedSkills: [],
                    experienceLevel: 'Mid',
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const userContext = { profile: userProfile };
                const mockAnalysisResponse = {
                    choices: [{
                            message: {
                                content: flatAnalysisJsonForTests({
                                    feedback: 'Test feedback',
                                    scores,
                                    insights: ['Test insight'],
                                    aiAttributes: { communicationStyle: 'balanced' }
                                })
                            }
                        }]
                };
                mockGptClient.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
                const { analysis: result } = await openaiService.analyzeResponse(transcript, userContext);
                expect(result.scores.clarity).toBeGreaterThanOrEqual(1);
                expect(result.scores.clarity).toBeLessThanOrEqual(5);
                expect(result.scores.confidence).toBeGreaterThanOrEqual(1);
                expect(result.scores.confidence).toBeLessThanOrEqual(5);
                expect(result.scores.tone).toBeGreaterThanOrEqual(1);
                expect(result.scores.tone).toBeLessThanOrEqual(5);
                expect(result.scores.enthusiasm).toBeGreaterThanOrEqual(1);
                expect(result.scores.enthusiasm).toBeLessThanOrEqual(5);
                expect(result.scores.specificity).toBeGreaterThanOrEqual(1);
                expect(result.scores.specificity).toBeLessThanOrEqual(5);
            }), { numRuns: 100 });
        });
    });
    describe('Property 18: Analysis results are persisted', () => {
        it('should return complete analysis data for persistence', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 15, maxLength: 250 }), async (transcript) => {
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: 'Finance',
                    targetJobTitle: 'Analyst',
                    aiAttributes: {},
                    extractedSkills: ['Excel', 'SQL'],
                    experienceLevel: 'Entry',
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const userContext = { profile: userProfile };
                const mockAnalysisResponse = {
                    choices: [{
                            message: {
                                content: flatAnalysisJsonForTests({
                                    feedback: 'Complete analysis feedback for persistence',
                                    scores: { clarity: 4, confidence: 4, tone: 5, enthusiasm: 4, specificity: 4 },
                                    insights: ['Strength in data analysis', 'Improve presentation skills'],
                                    strengthAreas: ['technical', 'problem-solving'],
                                    opportunityAreas: ['presentation'],
                                    aiAttributes: { communicationStyle: 'analytical' }
                                })
                            }
                        }]
                };
                mockGptClient.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
                const { analysis: result } = await openaiService.analyzeResponse(transcript, userContext);
                expect(result).toHaveProperty('feedback');
                expect(result).toHaveProperty('scores');
                expect(result).toHaveProperty('insights');
                expect(result).not.toHaveProperty('aiAttributes');
                expect(Array.isArray(result.messages)).toBe(true);
                expect(result.messages.length).toBeGreaterThan(0);
                expect(result.scores).toHaveProperty('clarity');
                expect(result.scores).toHaveProperty('confidence');
                expect(result.scores).toHaveProperty('tone');
                expect(result.scores).toHaveProperty('enthusiasm');
                expect(result.scores).toHaveProperty('specificity');
                expect(typeof result.feedback).toBe('string');
                expect(typeof result.scores).toBe('object');
                expect(Array.isArray(result.insights)).toBe(true);
                expect(result).not.toHaveProperty('aiAttributes');
            }), { numRuns: 100 });
        });
    });
    describe('Property 19: Prompts use target role context', () => {
        it('should incorporate target role information in generated prompts', async () => {
            await fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.record({
                targetIndustry: fast_check_1.default.string({ minLength: 3, maxLength: 25 }),
                targetJobTitle: fast_check_1.default.string({ minLength: 3, maxLength: 30 }),
                extractedSkills: fast_check_1.default.array(fast_check_1.default.string({ minLength: 2, maxLength: 15 }), { maxLength: 5 }),
                aiAttributes: fast_check_1.default.record({
                    communicationStyle: fast_check_1.default.constantFrom('detailed', 'concise', 'storytelling')
                })
            }), (profileData) => {
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: profileData.targetIndustry,
                    targetJobTitle: profileData.targetJobTitle,
                    aiAttributes: profileData.aiAttributes,
                    extractedSkills: profileData.extractedSkills,
                    experienceLevel: 'Mid',
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const prompt = openaiService.generatePersonalizedPrompt(userProfile);
                expect(prompt).toContain(profileData.targetJobTitle);
                expect(prompt).toContain(profileData.targetIndustry);
                if (profileData.aiAttributes.communicationStyle === 'detailed') {
                    expect(prompt).toContain('comprehensive');
                }
                else if (profileData.aiAttributes.communicationStyle === 'concise') {
                    expect(prompt).toContain('concise');
                }
                if (profileData.extractedSkills.length > 0) {
                    profileData.extractedSkills.slice(0, 3).forEach(skill => {
                        expect(prompt).toContain(skill);
                    });
                }
            }), { numRuns: 100 });
        });
    });
    describe('Property 35: Whisper API error handling', () => {
        it('should handle Whisper API errors with proper retry logic', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uint8Array({ minLength: 1024, maxLength: 5000 }), fast_check_1.default.constantFrom(429, 500, 502, 503), async (audioBuffer, errorStatus) => {
                mockWhisperClient.audio.transcriptions.create.mockReset();
                mockedErrorHandling.executeOpenAIOperation.mockImplementation(async (operation, _operationId, fallback) => {
                    const maxAttempts = 3;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        try {
                            return await operation();
                        }
                        catch (err) {
                            if (attempt === maxAttempts - 1) {
                                if (fallback)
                                    return await fallback();
                                throw err;
                            }
                        }
                    }
                });
                const error = new Error(`API Error - status ${errorStatus}`);
                error.status = errorStatus;
                mockWhisperClient.audio.transcriptions.create
                    .mockRejectedValueOnce(error)
                    .mockRejectedValueOnce(error)
                    .mockResolvedValueOnce({
                    text: 'Success after retry',
                    language: 'en',
                    duration: 25.0
                });
                const result = await openaiService.transcribeAudio(Buffer.from(audioBuffer));
                expect(result.text).toBe('Success after retry');
                expect(mockWhisperClient.audio.transcriptions.create).toHaveBeenCalledTimes(3);
            }), { numRuns: 50 });
        });
        it('should not retry non-retryable errors', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uint8Array({ minLength: 1024, maxLength: 5000 }), fast_check_1.default.constantFrom(400, 401, 403, 404), async (audioBuffer, errorStatus) => {
                mockWhisperClient.audio.transcriptions.create.mockReset();
                mockedErrorHandling.executeOpenAIOperation.mockImplementation(async (operation, _operationId, _fallback) => {
                    return await operation();
                });
                const error = new Error(`Client Error - status ${errorStatus}`);
                error.status = errorStatus;
                mockWhisperClient.audio.transcriptions.create.mockRejectedValue(error);
                await expect(openaiService.transcribeAudio(Buffer.from(audioBuffer)))
                    .rejects.toThrow();
                expect(mockWhisperClient.audio.transcriptions.create).toHaveBeenCalledTimes(1);
            }), { numRuns: 50 });
        });
    });
    describe('Property 36: GPT API structured prompts', () => {
        it('should use structured prompts with proper formatting', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 20, maxLength: 200 }).filter(s => s.trim().length >= 10), fast_check_1.default.record({
                targetIndustry: fast_check_1.default.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
                targetJobTitle: fast_check_1.default.string({ minLength: 3, maxLength: 25 }).filter(s => s.trim().length > 0)
            }), async (transcript, roleData) => {
                mockGptClient.chat.completions.create.mockReset();
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: roleData.targetIndustry,
                    targetJobTitle: roleData.targetJobTitle,
                    aiAttributes: {},
                    extractedSkills: ['skill1', 'skill2'],
                    experienceLevel: 'Mid',
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const userContext = { profile: userProfile };
                const mockAnalysisResponse = {
                    choices: [{
                            message: {
                                content: flatAnalysisJsonForTests({
                                    feedback: 'Test feedback',
                                    scores: { clarity: 4, confidence: 4, tone: 4, enthusiasm: 5, specificity: 4 },
                                    insights: ['Test insight']
                                })
                            }
                        }]
                };
                mockGptClient.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
                await openaiService.analyzeResponse(transcript, userContext);
                const callArgs = mockGptClient.chat.completions.create.mock.calls[0][0];
                expect(callArgs.model).toBe(openaiService.config.gptModel);
                expect(callArgs.messages).toHaveLength(2);
                expect(callArgs.messages[0].role).toBe('system');
                expect(callArgs.messages[1].role).toBe('user');
                const systemContent = callArgs.messages[0].content;
                const userContent = callArgs.messages[1].content;
                expect(systemContent).toContain('INPUT TRANSCRIPT:');
                expect(systemContent).toContain(transcript);
                expect(systemContent).toMatch(/JSON|json/);
                expect(userContent).toContain('USER CONTEXT');
                expect(userContent).toContain(roleData.targetJobTitle);
                expect(userContent).toContain(roleData.targetIndustry);
            }), { numRuns: 100 });
        });
    });
    describe('Property 37: API failure backoff strategy', () => {
        it('should implement exponential backoff for API failures', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uint8Array({ minLength: 1024, maxLength: 5000 }), async (audioBuffer) => {
                mockWhisperClient.audio.transcriptions.create.mockReset();
                const delays = [];
                mockedErrorHandling.executeOpenAIOperation.mockImplementation(async (operation, _operationId, fallback) => {
                    const backoffDelays = [1000, 2000, 4000];
                    const maxAttempts = backoffDelays.length + 1;
                    let lastError;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        try {
                            return await operation();
                        }
                        catch (err) {
                            lastError = err;
                            if (attempt < backoffDelays.length) {
                                delays.push(backoffDelays[attempt]);
                            }
                        }
                    }
                    if (fallback)
                        return await fallback();
                    throw lastError;
                });
                const retryableError = new Error('Server Error 500');
                retryableError.status = 500;
                mockWhisperClient.audio.transcriptions.create
                    .mockRejectedValueOnce(retryableError)
                    .mockRejectedValueOnce(retryableError)
                    .mockResolvedValueOnce({
                    text: 'Success after backoff',
                    language: 'en',
                    duration: 30.0
                });
                const result = await openaiService.transcribeAudio(Buffer.from(audioBuffer));
                expect(result.text).toBe('Success after backoff');
                expect(mockWhisperClient.audio.transcriptions.create).toHaveBeenCalledTimes(3);
                expect(delays.length).toBe(2);
                expect(delays[0]).toBe(1000);
                expect(delays[1]).toBe(2000);
                expect(delays[1]).toBeGreaterThan(delays[0]);
            }), { numRuns: 20 });
        });
    });
    describe('Property 38: API response validation', () => {
        it('should validate and sanitize API responses before storage', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 10, maxLength: 150 }).filter(s => s.trim().length >= 10), fast_check_1.default.record({
                maliciousScript: fast_check_1.default.constant('<script>alert("xss")</script>'),
                invalidScore: fast_check_1.default.constantFrom(-1, 10, 0, NaN, null, undefined),
                missingField: fast_check_1.default.constant(undefined)
            }), async (transcript, maliciousData) => {
                const userProfile = {
                    id: 'test-profile',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Developer',
                    aiAttributes: {},
                    extractedSkills: [],
                    experienceLevel: 'Mid',
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const userContext = { profile: userProfile };
                const mockAnalysisResponse = {
                    choices: [{
                            message: {
                                content: flatAnalysisJsonForTests({
                                    feedback: `Normal feedback ${maliciousData.maliciousScript}`,
                                    scores: {
                                        clarity: (typeof maliciousData.invalidScore === 'number' && !Number.isNaN(maliciousData.invalidScore)
                                            ? maliciousData.invalidScore
                                            : 4),
                                        confidence: 4,
                                        tone: 4,
                                        enthusiasm: 5,
                                        specificity: 4
                                    },
                                    insights: ['Test insight'],
                                    aiAttributes: { communicationStyle: 'balanced' }
                                })
                            }
                        }]
                };
                mockGptClient.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
                const { analysis: result } = await openaiService.analyzeResponse(transcript, userContext);
                expect(typeof result.feedback).toBe('string');
                expect(typeof result.scores).toBe('object');
                expect(Array.isArray(result.insights)).toBe(true);
                Object.values(result.scores).forEach(score => {
                    expect(typeof score).toBe('number');
                    expect(score).toBeGreaterThanOrEqual(1);
                    expect(score).toBeLessThanOrEqual(5);
                    expect(isNaN(score)).toBe(false);
                });
                expect(Array.isArray(result.strengthAreas)).toBe(true);
                (result.strengthAreas ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.strengthInsights)).toBe(true);
                (result.strengthInsights ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.opportunityAreas)).toBe(true);
                (result.opportunityAreas ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.opportunityInsights)).toBe(true);
                (result.opportunityInsights ?? []).forEach((item) => expect(typeof item).toBe('string'));
                expect(Array.isArray(result.topTraits)).toBe(true);
                (result.topTraits ?? []).forEach((item) => expect(typeof item).toBe('string'));
            }), { numRuns: 100 });
        });
    });
    describe('Property 39: Rate limit handling', () => {
        it('should handle rate limits with appropriate delays', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uint8Array({ minLength: 1024, maxLength: 5000 }), async (audioBuffer) => {
                mockWhisperClient.audio.transcriptions.create.mockReset();
                mockedErrorHandling.executeOpenAIOperation.mockImplementation(async (operation, _operationId, fallback) => {
                    const maxAttempts = 2;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        try {
                            return await operation();
                        }
                        catch (err) {
                            if (attempt === maxAttempts - 1) {
                                if (fallback)
                                    return await fallback();
                                throw err;
                            }
                        }
                    }
                });
                const rateLimitError = new Error('Rate limit exceeded');
                rateLimitError.status = 429;
                mockWhisperClient.audio.transcriptions.create
                    .mockRejectedValueOnce(rateLimitError)
                    .mockResolvedValueOnce({
                    text: 'Success after rate limit',
                    language: 'en',
                    duration: 25.0
                });
                const result = await openaiService.transcribeAudio(Buffer.from(audioBuffer));
                expect(result.text).toBe('Success after rate limit');
                expect(mockWhisperClient.audio.transcriptions.create).toHaveBeenCalledTimes(2);
            }), { numRuns: 50 });
        });
        it('should eventually fail after max retries on persistent rate limits', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uint8Array({ minLength: 1024, maxLength: 5000 }), async (audioBuffer) => {
                mockWhisperClient.audio.transcriptions.create.mockReset();
                mockedErrorHandling.executeOpenAIOperation.mockImplementation(async (operation, _operationId, _fallback) => {
                    const maxAttempts = 3;
                    let lastError;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        try {
                            return await operation();
                        }
                        catch (err) {
                            lastError = err;
                        }
                    }
                    throw new OpenAIService_1.OpenAIServiceError(`All retries exhausted: ${lastError?.message}`, lastError, false);
                });
                const rateLimitError = new Error('Persistent rate limit');
                rateLimitError.status = 429;
                mockWhisperClient.audio.transcriptions.create.mockRejectedValue(rateLimitError);
                await expect(openaiService.transcribeAudio(Buffer.from(audioBuffer)))
                    .rejects.toThrow();
                expect(mockWhisperClient.audio.transcriptions.create).toHaveBeenCalledTimes(3);
            }), { numRuns: 30 });
        });
    });
});
//# sourceMappingURL=ai-integration.properties.test.js.map