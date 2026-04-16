"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OpenAIService_1 = require("../../../src/services/OpenAIService");
process.env.OPENAI_API_KEY = 'test-gpt-api-key';
process.env.WHISPER_API_KEY = 'test-whisper-api-key';
const analysisConfigDefaults = {
    analysisTierSMaxInputTokens: 48000,
    analysisPromptVersion: '1',
    enableLongTranscriptPipeline: false,
    whisperTimeoutMs: 180000
};
describe('OpenAI Service Configuration', () => {
    describe('loadOpenAIConfig', () => {
        it('should load configuration from environment variables', () => {
            const originalModel = process.env.OPENAI_MODEL;
            const originalCtx = process.env.OPENAI_CONTEXT_LIMIT;
            delete process.env.OPENAI_MODEL;
            delete process.env.OPENAI_CONTEXT_LIMIT;
            const config = (0, OpenAIService_1.loadOpenAIConfig)();
            expect(config.gptApiKey).toBe('test-gpt-api-key');
            expect(config.whisperApiKey).toBe('test-whisper-api-key');
            expect(config.maxRetries).toBe(3);
            expect(config.timeout).toBe(60000);
            expect(config.whisperTimeoutMs).toBe(180000);
            expect(config.gptModel).toBe('gpt-5-mini');
            expect(config.contextTokenLimit).toBeUndefined();
            expect(config.analysisTierSMaxInputTokens).toBe(48000);
            expect(config.analysisPromptVersion).toBe('1');
            expect(config.enableLongTranscriptPipeline).toBe(false);
            if (originalModel !== undefined)
                process.env.OPENAI_MODEL = originalModel;
            else
                delete process.env.OPENAI_MODEL;
            if (originalCtx !== undefined)
                process.env.OPENAI_CONTEXT_LIMIT = originalCtx;
            else
                delete process.env.OPENAI_CONTEXT_LIMIT;
        });
        it('should load OPENAI_MODEL and OPENAI_CONTEXT_LIMIT when set', () => {
            const originalModel = process.env.OPENAI_MODEL;
            const originalCtx = process.env.OPENAI_CONTEXT_LIMIT;
            process.env.OPENAI_MODEL = ' gpt-5-mini ';
            process.env.OPENAI_CONTEXT_LIMIT = '16384';
            const config = (0, OpenAIService_1.loadOpenAIConfig)();
            expect(config.gptModel).toBe('gpt-5-mini');
            expect(config.contextTokenLimit).toBe(16384);
            if (originalModel !== undefined)
                process.env.OPENAI_MODEL = originalModel;
            else
                delete process.env.OPENAI_MODEL;
            if (originalCtx !== undefined)
                process.env.OPENAI_CONTEXT_LIMIT = originalCtx;
            else
                delete process.env.OPENAI_CONTEXT_LIMIT;
        });
        it('should load OPENAI_WHISPER_TIMEOUT_MS when set', () => {
            const original = process.env.OPENAI_WHISPER_TIMEOUT_MS;
            process.env.OPENAI_WHISPER_TIMEOUT_MS = '240000';
            const config = (0, OpenAIService_1.loadOpenAIConfig)();
            expect(config.whisperTimeoutMs).toBe(240000);
            if (original !== undefined)
                process.env.OPENAI_WHISPER_TIMEOUT_MS = original;
            else
                delete process.env.OPENAI_WHISPER_TIMEOUT_MS;
        });
        it('should throw error when GPT API key is missing', () => {
            const originalApiKey = process.env.OPENAI_API_KEY;
            delete process.env.OPENAI_API_KEY;
            expect(() => (0, OpenAIService_1.loadOpenAIConfig)()).toThrow('Missing required environment variable: OPENAI_API_KEY');
            process.env.OPENAI_API_KEY = originalApiKey;
        });
        it('should throw error when Whisper API key is missing', () => {
            const originalWhisperKey = process.env.WHISPER_API_KEY;
            delete process.env.WHISPER_API_KEY;
            expect(() => (0, OpenAIService_1.loadOpenAIConfig)()).toThrow('Missing required environment variable: WHISPER_API_KEY');
            process.env.WHISPER_API_KEY = originalWhisperKey;
        });
    });
    describe('validateOpenAIConfig', () => {
        it('should validate valid configuration', () => {
            const config = {
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 60000,
                gptModel: 'gpt-3.5-turbo',
                ...analysisConfigDefaults
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).not.toThrow();
        });
        it('should throw error for empty GPT API key', () => {
            const config = {
                gptApiKey: '',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 60000,
                gptModel: 'gpt-3.5-turbo',
                ...analysisConfigDefaults
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).toThrow('OPENAI_API_KEY (gptApiKey) cannot be empty');
        });
        it('should throw error for empty Whisper API key', () => {
            const config = {
                gptApiKey: 'test-gpt-key',
                whisperApiKey: '',
                maxRetries: 3,
                timeout: 60000,
                gptModel: 'gpt-3.5-turbo',
                ...analysisConfigDefaults
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).toThrow('WHISPER_API_KEY (whisperApiKey) cannot be empty');
        });
        it('should throw error for empty gptModel', () => {
            const config = {
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 60000,
                gptModel: '   ',
                ...analysisConfigDefaults
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).toThrow('gptModel (OPENAI_MODEL) cannot be empty');
        });
        it('should throw error for invalid contextTokenLimit', () => {
            const config = {
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 60000,
                gptModel: 'gpt-3.5-turbo',
                contextTokenLimit: 0,
                ...analysisConfigDefaults
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).toThrow('contextTokenLimit (OPENAI_CONTEXT_LIMIT) must be a positive number when set');
        });
        it('should throw error for invalid retry count', () => {
            const config = {
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: -1,
                timeout: 60000,
                gptModel: 'gpt-3.5-turbo',
                ...analysisConfigDefaults
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).toThrow('maxRetries must be between 0 and 10');
        });
        it('should throw error for invalid timeout', () => {
            const config = {
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 500,
                gptModel: 'gpt-3.5-turbo',
                ...analysisConfigDefaults
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).toThrow('timeout must be between 1000ms and 300000ms');
        });
        it('should throw error for invalid whisperTimeoutMs', () => {
            const config = {
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 60000,
                gptModel: 'gpt-3.5-turbo',
                ...analysisConfigDefaults,
                whisperTimeoutMs: 500
            };
            expect(() => (0, OpenAIService_1.validateOpenAIConfig)(config)).toThrow('whisperTimeoutMs must be between 1000ms and 600000ms');
        });
    });
    describe('getContextLimitForModel', () => {
        it('returns 8192 for legacy gpt-4 ids', () => {
            expect((0, OpenAIService_1.getContextLimitForModel)('gpt-4')).toBe(8192);
            expect((0, OpenAIService_1.getContextLimitForModel)('GPT-4-0613')).toBe(8192);
        });
        it('returns large default for unknown models', () => {
            expect((0, OpenAIService_1.getContextLimitForModel)('gpt-5-mini')).toBe(400000);
        });
        it('uses override when positive', () => {
            expect((0, OpenAIService_1.getContextLimitForModel)('gpt-4', 16384)).toBe(16384);
        });
    });
    describe('computeSafeMaxCompletionTokens', () => {
        it('caps completion below desired max when prompt fills an 8k context model', () => {
            const chunk = 'x'.repeat(3000 * 4);
            const max = (0, OpenAIService_1.computeSafeMaxCompletionTokens)({
                model: 'gpt-4',
                systemText: chunk,
                userText: 'y'.repeat(500),
                desiredMax: OpenAIService_1.ANALYSIS_DESIRED_MAX_COMPLETION,
                margin: 256,
                minFloor: 1024
            });
            expect(max).toBeLessThan(OpenAIService_1.ANALYSIS_DESIRED_MAX_COMPLETION);
            expect(max).toBeGreaterThanOrEqual(1024);
        });
        it('keeps desired max for large-context models with a short prompt', () => {
            const max = (0, OpenAIService_1.computeSafeMaxCompletionTokens)({
                model: 'gpt-5-mini',
                systemText: 'short',
                userText: 'also short',
                desiredMax: OpenAIService_1.ANALYSIS_DESIRED_MAX_COMPLETION,
                margin: 256,
                minFloor: 1024
            });
            expect(max).toBe(OpenAIService_1.ANALYSIS_DESIRED_MAX_COMPLETION);
        });
    });
    describe('OpenAIService instantiation', () => {
        it('should create service with custom config', () => {
            const customConfig = {
                gptApiKey: 'custom-gpt-key',
                whisperApiKey: 'custom-whisper-key',
                maxRetries: 2,
                timeout: 30000,
                gptModel: 'gpt-4',
                ...analysisConfigDefaults
            };
            const service = new OpenAIService_1.OpenAIService(customConfig);
            expect(service).toBeInstanceOf(OpenAIService_1.OpenAIService);
        });
        it('should create service with default config', () => {
            const service = new OpenAIService_1.OpenAIService();
            expect(service).toBeInstanceOf(OpenAIService_1.OpenAIService);
        });
    });
    describe('generatePersonalizedPrompt', () => {
        let openaiService;
        beforeEach(() => {
            openaiService = new OpenAIService_1.OpenAIService({
                gptApiKey: 'test-gpt-api-key',
                whisperApiKey: 'test-whisper-api-key',
                maxRetries: 2,
                timeout: 30000,
                ...analysisConfigDefaults
            });
        });
        it('should generate personalized prompt with full profile', () => {
            const userProfile = {
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
                aiAttributes: { communicationStyle: 'detailed' },
                extractedSkills: ['JavaScript', 'React', 'Node.js'],
                experienceLevel: 'Mid',
                resumeS3Key: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = openaiService.generatePersonalizedPrompt(userProfile);
            expect(result).toContain('Software Engineer');
            expect(result).toContain('Technology');
            expect(result).toContain('JavaScript');
            expect(result).toContain('comprehensive answer');
        });
        it('should generate basic prompt with minimal profile', () => {
            const userProfile = {
                id: 'profile-1',
                userId: 'user-1',
                fullName: null,
                currentJobTitle: null,
                currentCompany: null,
                school: null,
                degreeInfo: null,
                previousJobTitles: [],
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                resumeS3Key: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = openaiService.generatePersonalizedPrompt(userProfile);
            expect(result).toContain('challenging project');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
        it('should handle concise communication style', () => {
            const userProfile = {
                id: 'profile-1',
                userId: 'user-1',
                fullName: null,
                currentJobTitle: null,
                currentCompany: null,
                school: null,
                degreeInfo: null,
                previousJobTitles: [],
                targetIndustry: 'Finance',
                targetJobTitle: 'Analyst',
                aiAttributes: { communicationStyle: 'concise' },
                extractedSkills: ['Excel', 'SQL'],
                experienceLevel: 'Entry',
                resumeS3Key: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = openaiService.generatePersonalizedPrompt(userProfile);
            expect(result).toContain('Analyst');
            expect(result).toContain('Finance');
            expect(result).toContain('clear and concise');
        });
    });
    describe('analysis response parsing compatibility', () => {
        it('should parse flat analysisVersion 2 JSON and normalize candidate feedback', () => {
            const openaiService = new OpenAIService_1.OpenAIService({
                gptApiKey: 'test-gpt-api-key',
                whisperApiKey: 'test-whisper-api-key',
                maxRetries: 2,
                timeout: 30000,
                ...analysisConfigDefaults
            });
            const response = JSON.stringify({
                analysisVersion: 2,
                participants: {
                    candidate: { id: 'candidate', displayName: 'Candidate' },
                    interviewers: [{ id: 'interviewer_1', displayName: 'Interviewer 1' }]
                },
                messages: [
                    { id: 'm1', role: 'interviewer', speakerId: 'interviewer_1', text: 'Q?', edited: { isEdited: false, editedText: '' } },
                    {
                        id: 'm2',
                        role: 'candidate',
                        speakerId: 'candidate',
                        text: 'A.',
                        edited: { isEdited: false, editedText: '' },
                        candidateFeedback: { flag: 'Good', label: 'Good', reason: 'Clear.', categoryTags: ['clarity'] }
                    }
                ],
                feedback: 'You did well.',
                scores: { clarity: 4, confidence: 4, tone: 4, enthusiasm: 3, specificity: 3 },
                insights: ['You were clear.', 'Add examples.'],
                topTraits: ['Clear communicator', 'Structured answers'],
                strengthAreas: ['communication'],
                strengthInsights: ['You were clear under pressure.'],
                opportunityAreas: ['examples'],
                opportunityInsights: ['Add more concrete examples.'],
                aiAttributes: { communicationStyle: 'concise' }
            });
            const parsed = openaiService.parseAnalysisResponse(response, {
                profile: { id: 'p1', extractedSkills: [], experienceLevel: null, targetIndustry: null, targetJobTitle: null }
            });
            expect(parsed.analysis.feedback).toBe('You did well.');
            expect(parsed.analysis.analysisVersion).toBe(2);
            expect(parsed.analysis.scores.clarity).toBe(4);
            expect(parsed.analysis.topTraits.length).toBeGreaterThanOrEqual(2);
            expect(parsed.analysis.messages.length).toBe(2);
            expect(parsed.analysis.messages[1].feedback).toEqual({ flag: 'Good' });
            expect(parsed.profileAiAttributes.communicationStyle).toBe('concise');
            expect(parsed.analysis).not.toHaveProperty('conversation');
            expect(parsed.analysis).not.toHaveProperty('aiAttributes');
        });
    });
    describe('OpenAIServiceError', () => {
        it('should create error with message and retryable flag', () => {
            const error = new OpenAIService_1.OpenAIServiceError('Test error', undefined, true);
            expect(error.message).toBe('Test error');
            expect(error.retryable).toBe(true);
            expect(error.name).toBe('OpenAIServiceError');
        });
        it('should create error with original error', () => {
            const originalError = new Error('Original error');
            const error = new OpenAIService_1.OpenAIServiceError('Wrapper error', originalError, false);
            expect(error.message).toBe('Wrapper error');
            expect(error.originalError).toBe(originalError);
            expect(error.retryable).toBe(false);
        });
    });
});
//# sourceMappingURL=OpenAIService.test.js.map