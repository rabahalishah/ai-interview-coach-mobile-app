"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OpenAIService_1 = require("../../../src/services/OpenAIService");
const S3Service_1 = require("../../../src/services/S3Service");
const auth_1 = require("../../../src/types/auth");
describe('Input Validation', () => {
    describe('OpenAIService - Audio Buffer Validation', () => {
        let openaiService;
        beforeEach(() => {
            process.env.OPENAI_API_KEY = 'test-gpt-key';
            process.env.WHISPER_API_KEY = 'test-whisper-key';
            openaiService = new OpenAIService_1.OpenAIService();
        });
        afterEach(() => {
            delete process.env.OPENAI_API_KEY;
            delete process.env.WHISPER_API_KEY;
        });
        it('should throw ValidationError when audio buffer is empty', async () => {
            const emptyBuffer = Buffer.from([]);
            await expect(openaiService.transcribeAudio(emptyBuffer, 'test.wav')).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.transcribeAudio(emptyBuffer, 'test.wav')).rejects.toThrow('Audio buffer cannot be empty');
        });
        it('should throw ValidationError when audio buffer is null or undefined', async () => {
            await expect(openaiService.transcribeAudio(null, 'test.wav')).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.transcribeAudio(undefined, 'test.wav')).rejects.toThrow(auth_1.ValidationError);
        });
        it('should throw ValidationError when audio buffer exceeds size limit', async () => {
            const maxSize = 25 * 1024 * 1024;
            const oversizedBuffer = Buffer.alloc(maxSize + 1);
            await expect(openaiService.transcribeAudio(oversizedBuffer, 'test.wav')).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.transcribeAudio(oversizedBuffer, 'test.wav')).rejects.toThrow(/exceeds maximum allowed size/);
        });
        it('should throw ValidationError when audio buffer is too small', async () => {
            const tinyBuffer = Buffer.from([1, 2, 3]);
            await expect(openaiService.transcribeAudio(tinyBuffer, 'test.wav')).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.transcribeAudio(tinyBuffer, 'test.wav')).rejects.toThrow(/too small to be a valid audio file/);
        });
        it('should accept valid audio buffer within size limits', async () => {
            const validBuffer = Buffer.alloc(2048);
            const mockTranscribe = jest.fn().mockResolvedValue({
                text: 'Test transcription',
                language: 'en',
                duration: 10
            });
            openaiService.whisperClient = {
                audio: {
                    transcriptions: {
                        create: mockTranscribe
                    }
                }
            };
            await expect(openaiService.transcribeAudio(validBuffer, 'test.wav')).resolves.toBeDefined();
        });
    });
    describe('OpenAIService - Text Input Validation', () => {
        let openaiService;
        beforeEach(() => {
            process.env.OPENAI_API_KEY = 'test-gpt-key';
            process.env.WHISPER_API_KEY = 'test-whisper-key';
            openaiService = new OpenAIService_1.OpenAIService();
        });
        afterEach(() => {
            delete process.env.OPENAI_API_KEY;
            delete process.env.WHISPER_API_KEY;
        });
        it('should throw ValidationError when text is empty', async () => {
            const userContext = {
                profile: {
                    id: 'test-user-id',
                    targetJobTitle: 'Software Engineer',
                    targetIndustry: 'Technology',
                    extractedSkills: ['JavaScript', 'TypeScript'],
                    experienceLevel: 'Mid'
                }
            };
            await expect(openaiService.analyzeResponse('', userContext)).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.analyzeResponse('   ', userContext)).rejects.toThrow('Transcript cannot be empty');
        });
        it('should throw ValidationError when text is too short', async () => {
            const userContext = {
                profile: {
                    id: 'test-user-id',
                    targetJobTitle: 'Software Engineer'
                }
            };
            await expect(openaiService.analyzeResponse('Hi', userContext)).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.analyzeResponse('Hi', userContext)).rejects.toThrow(/too short/);
        });
        it('should throw ValidationError when text exceeds analysis transcript limit', async () => {
            const oversizedText = 'a'.repeat(1000001);
            const userContext = {
                profile: {
                    id: 'test-user-id',
                    targetJobTitle: 'Software Engineer'
                }
            };
            await expect(openaiService.analyzeResponse(oversizedText, userContext)).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.analyzeResponse(oversizedText, userContext)).rejects.toThrow(/too long/);
        });
        it('should throw ValidationError when transcript needs tier L but long pipeline is disabled', async () => {
            const longBody = `${'word '.repeat(8000)}end.`;
            const strictService = new OpenAIService_1.OpenAIService({
                gptApiKey: 'test-gpt-api-key',
                whisperApiKey: 'test-whisper-api-key',
                maxRetries: 2,
                timeout: 30000,
                gptModel: 'gpt-5-mini',
                analysisTierSMaxInputTokens: 500,
                analysisPromptVersion: '1',
                enableLongTranscriptPipeline: false
            });
            const userContext = {
                profile: {
                    id: 'test-user-id',
                    targetJobTitle: 'Software Engineer'
                }
            };
            await expect(strictService.analyzeResponse(longBody, userContext)).rejects.toThrow(auth_1.ValidationError);
            await expect(strictService.analyzeResponse(longBody, userContext)).rejects.toThrow(/ENABLE_LONG_TRANSCRIPT_PIPELINE/i);
        });
        it('should throw ValidationError when resume text is empty', async () => {
            await expect(openaiService.extractResumeData('')).rejects.toThrow(auth_1.ValidationError);
            await expect(openaiService.extractResumeData('   ')).rejects.toThrow('Resume text cannot be empty');
        });
        it('should accept valid text within token limits', async () => {
            const validText = 'This is a valid response with sufficient length for analysis.';
            const userContext = {
                profile: {
                    id: 'test-user-id',
                    targetJobTitle: 'Software Engineer',
                    targetIndustry: 'Technology',
                    extractedSkills: ['JavaScript'],
                    experienceLevel: 'Mid'
                }
            };
            const mockCreate = jest.fn().mockResolvedValue({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                analysisVersion: 2,
                                feedback: 'Good response',
                                scores: {
                                    clarity: 85,
                                    confidence: 80,
                                    tone: 90,
                                    enthusiasm: 85,
                                    specificity: 75
                                },
                                insights: ['Good detail', 'Clear communication'],
                                topTraits: ['Clear speaker', 'Engaged tone'],
                                strengthAreas: ['communication'],
                                strengthInsights: ['You explained ideas clearly.'],
                                opportunityAreas: ['specificity'],
                                opportunityInsights: ['Add one more metric per story.'],
                                aiAttributes: { communicationStyle: 'balanced' },
                                participants: {
                                    candidate: { id: 'candidate', displayName: 'Candidate' },
                                    interviewers: [{ id: 'interviewer_1', displayName: 'Interviewer 1' }]
                                },
                                messages: [
                                    {
                                        id: 'm1',
                                        role: 'interviewer',
                                        speakerId: 'interviewer_1',
                                        text: 'Tell me about yourself.',
                                        edited: { isEdited: false, editedText: '' }
                                    },
                                    {
                                        id: 'm2',
                                        role: 'candidate',
                                        speakerId: 'candidate',
                                        text: 'This is a valid response with sufficient length for analysis.',
                                        edited: { isEdited: false, editedText: '' },
                                        feedback: { flag: 'Good' }
                                    }
                                ]
                            })
                        }
                    }]
            });
            openaiService.gptClient = {
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            };
            await expect(openaiService.analyzeResponse(validText, userContext)).resolves.toBeDefined();
        });
    });
    describe('S3Service - File Upload Validation', () => {
        let s3Service;
        beforeEach(() => {
            s3Service = new S3Service_1.S3Service({
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
                region: 'us-east-1',
                bucketName: 'test-bucket'
            });
        });
        it('should throw ValidationError when file buffer is empty', () => {
            const emptyBuffer = Buffer.from([]);
            expect(() => {
                s3Service.validateFile(emptyBuffer, 'test.pdf');
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(emptyBuffer, 'test.pdf');
            }).toThrow('File cannot be empty');
        });
        it('should throw ValidationError when filename is missing', () => {
            const buffer = Buffer.from('test content');
            expect(() => {
                s3Service.validateFile(buffer, '');
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(buffer, '   ');
            }).toThrow('Filename is required');
        });
        it('should throw ValidationError when file exceeds size limit', () => {
            const maxSize = 50 * 1024 * 1024;
            const oversizedBuffer = Buffer.alloc(maxSize + 1);
            expect(() => {
                s3Service.validateFile(oversizedBuffer, 'test.pdf');
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(oversizedBuffer, 'test.pdf');
            }).toThrow(/exceeds maximum allowed size/);
        });
        it('should throw ValidationError when file type is not allowed', () => {
            const buffer = Buffer.from('test content');
            expect(() => {
                s3Service.validateFile(buffer, 'test.exe');
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(buffer, 'test.exe');
            }).toThrow(/not allowed/);
        });
        it('should throw ValidationError when file has no extension', () => {
            const buffer = Buffer.from('test content');
            expect(() => {
                s3Service.validateFile(buffer, 'testfile');
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(buffer, 'testfile');
            }).toThrow('File must have a valid extension');
        });
        it('should throw ValidationError when file is too small', () => {
            const tinyBuffer = Buffer.from([1, 2, 3]);
            expect(() => {
                s3Service.validateFile(tinyBuffer, 'test.pdf');
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(tinyBuffer, 'test.pdf');
            }).toThrow(/too small to be valid/);
        });
        it('should accept valid PDF file', () => {
            const validBuffer = Buffer.alloc(1024);
            expect(() => {
                s3Service.validateFile(validBuffer, 'resume.pdf');
            }).not.toThrow();
        });
        it('should accept valid DOCX file', () => {
            const validBuffer = Buffer.alloc(1024);
            expect(() => {
                s3Service.validateFile(validBuffer, 'resume.docx');
            }).not.toThrow();
        });
        it('should accept valid DOC file', () => {
            const validBuffer = Buffer.alloc(1024);
            expect(() => {
                s3Service.validateFile(validBuffer, 'resume.doc');
            }).not.toThrow();
        });
        it('should respect custom allowed types', () => {
            const buffer = Buffer.alloc(1024);
            expect(() => {
                s3Service.validateFile(buffer, 'test.pdf', {
                    allowedTypes: ['.jpg', '.png']
                });
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(buffer, 'test.jpg', {
                    allowedTypes: ['.jpg', '.png']
                });
            }).not.toThrow();
        });
        it('should respect custom max size', () => {
            const buffer = Buffer.alloc(2048);
            expect(() => {
                s3Service.validateFile(buffer, 'test.pdf', {
                    maxSizeBytes: 1024
                });
            }).toThrow(auth_1.ValidationError);
            expect(() => {
                s3Service.validateFile(buffer, 'test.pdf', {
                    maxSizeBytes: 3072
                });
            }).not.toThrow();
        });
    });
    describe('S3Service - Upload Method Validation', () => {
        let s3Service;
        beforeEach(() => {
            s3Service = new S3Service_1.S3Service({
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
                region: 'us-east-1',
                bucketName: 'test-bucket'
            });
        });
        it('should throw ValidationError when key is empty', async () => {
            const buffer = Buffer.from('test content');
            await expect(s3Service.upload('', buffer)).rejects.toThrow(auth_1.ValidationError);
            await expect(s3Service.upload('   ', buffer)).rejects.toThrow('Key is required for upload');
        });
        it('should throw ValidationError when buffer is null', async () => {
            await expect(s3Service.upload('test-key', null)).rejects.toThrow(auth_1.ValidationError);
            await expect(s3Service.upload('test-key', null)).rejects.toThrow('Buffer is required for upload');
        });
        it('should throw ValidationError when buffer is empty', async () => {
            const emptyBuffer = Buffer.from([]);
            await expect(s3Service.upload('test-key', emptyBuffer)).rejects.toThrow(auth_1.ValidationError);
            await expect(s3Service.upload('test-key', emptyBuffer)).rejects.toThrow('Buffer cannot be empty');
        });
    });
    describe('Validation Error Messages', () => {
        it('should provide descriptive error messages for audio validation', async () => {
            process.env.OPENAI_API_KEY = 'test-gpt-key';
            process.env.WHISPER_API_KEY = 'test-whisper-key';
            const openaiService = new OpenAIService_1.OpenAIService();
            const emptyBuffer = Buffer.from([]);
            try {
                await openaiService.transcribeAudio(emptyBuffer, 'test.wav');
                fail('Should have thrown ValidationError');
            }
            catch (error) {
                expect(error).toBeInstanceOf(auth_1.ValidationError);
                expect(error.message).toContain('Audio buffer cannot be empty');
            }
            delete process.env.OPENAI_API_KEY;
            delete process.env.WHISPER_API_KEY;
        });
        it('should provide descriptive error messages for text validation', async () => {
            process.env.OPENAI_API_KEY = 'test-gpt-key';
            process.env.WHISPER_API_KEY = 'test-whisper-key';
            const openaiService = new OpenAIService_1.OpenAIService();
            const userContext = {
                profile: { id: 'test-user-id' }
            };
            try {
                await openaiService.analyzeResponse('', userContext);
                fail('Should have thrown ValidationError');
            }
            catch (error) {
                expect(error).toBeInstanceOf(auth_1.ValidationError);
                expect(error.message).toContain('Transcript cannot be empty');
            }
            delete process.env.OPENAI_API_KEY;
            delete process.env.WHISPER_API_KEY;
        });
        it('should provide descriptive error messages for file validation', () => {
            const s3Service = new S3Service_1.S3Service({
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
                region: 'us-east-1',
                bucketName: 'test-bucket'
            });
            const buffer = Buffer.from('test');
            try {
                s3Service.validateFile(buffer, 'test.exe');
                fail('Should have thrown ValidationError');
            }
            catch (error) {
                expect(error).toBeInstanceOf(auth_1.ValidationError);
                expect(error.message).toContain('not allowed');
                expect(error.message).toContain('.exe');
            }
        });
    });
});
//# sourceMappingURL=InputValidation.test.js.map