"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ErrorHandlingService_1 = require("../../src/services/ErrorHandlingService");
const OpenAIService_1 = require("../../src/services/OpenAIService");
const S3Service_1 = require("../../src/services/S3Service");
const MonitoringService_1 = require("../../src/services/MonitoringService");
describe('Error Handling and Retry Logic Integration Tests', () => {
    let errorHandlingService;
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;
    beforeAll(() => {
        jest.useRealTimers();
        errorHandlingService = ErrorHandlingService_1.ErrorHandlingService.getInstance();
    });
    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
            const message = typeof args[0] === 'string' ? args[0] : '';
            if (message.includes('health check')) {
                return;
            }
        });
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
            const message = typeof args[0] === 'string' ? args[0] : '';
            if (message.includes('health check')) {
                return;
            }
        });
    });
    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
    afterAll(() => {
        MonitoringService_1.monitoringService.stopPeriodicMonitoring();
    });
    describe('Retry Logic with Exponential Backoff', () => {
        it('should retry with exponential backoff delays (1s, 2s, 4s)', async () => {
            let attemptCount = 0;
            const attemptTimestamps = [];
            const operation = jest.fn().mockImplementation(async () => {
                attemptTimestamps.push(Date.now());
                attemptCount++;
                if (attemptCount < 3) {
                    const error = new Error('Temporary server error');
                    error.statusCode = 500;
                    throw error;
                }
                return 'success';
            });
            const result = await errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-retry-backoff',
                isRetryable: () => true
            });
            expect(result).toBe('success');
            expect(attemptCount).toBe(3);
            expect(operation).toHaveBeenCalledTimes(3);
            if (attemptTimestamps.length >= 3) {
                const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
                const delay2 = attemptTimestamps[2] - attemptTimestamps[1];
                expect(delay1).toBeGreaterThanOrEqual(900);
                expect(delay1).toBeLessThanOrEqual(1200);
                expect(delay2).toBeGreaterThanOrEqual(1900);
                expect(delay2).toBeLessThanOrEqual(2200);
            }
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying operation'), expect.objectContaining({
                error: 'Temporary server error',
                delayMs: 1000
            }));
        }, 10000);
        it('should fail after all retry attempts exhausted', async () => {
            let attemptCount = 0;
            const operation = jest.fn().mockImplementation(async () => {
                attemptCount++;
                const error = new Error('Persistent server error');
                error.statusCode = 500;
                throw error;
            });
            await expect(errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-retry-exhausted',
                isRetryable: () => true
            })).rejects.toThrow('Persistent server error');
            expect(attemptCount).toBe(4);
            expect(operation).toHaveBeenCalledTimes(4);
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Operation test-retry-exhausted failed after 4 attempts'), expect.objectContaining({
                error: 'Persistent server error'
            }));
        }, 10000);
        it('should not retry non-retryable errors', async () => {
            let attemptCount = 0;
            const operation = jest.fn().mockImplementation(async () => {
                attemptCount++;
                const error = new Error('Not found');
                error.statusCode = 404;
                throw error;
            });
            await expect(errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-non-retryable',
                isRetryable: (error) => {
                    const statusCode = error.statusCode;
                    return statusCode === 500 || statusCode === 503;
                }
            })).rejects.toThrow('Not found');
            expect(attemptCount).toBe(1);
            expect(operation).toHaveBeenCalledTimes(1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('failed with non-retryable error'), expect.objectContaining({
                error: 'Not found'
            }));
        });
    });
    describe('OpenAI Rate Limit Handling', () => {
        it('should respect Retry-After header from OpenAI rate limits', async () => {
            let attemptCount = 0;
            const attemptTimestamps = [];
            const operation = jest.fn().mockImplementation(async () => {
                attemptTimestamps.push(Date.now());
                attemptCount++;
                if (attemptCount === 1) {
                    const error = new Error('Rate limit exceeded');
                    error.statusCode = 429;
                    error.response = {
                        headers: {
                            'retry-after': '2'
                        }
                    };
                    throw error;
                }
                return 'success';
            });
            const result = await errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-rate-limit',
                isRetryable: () => true
            });
            expect(result).toBe('success');
            expect(attemptCount).toBe(2);
            if (attemptTimestamps.length >= 2) {
                const delay = attemptTimestamps[1] - attemptTimestamps[0];
                expect(delay).toBeGreaterThanOrEqual(1900);
                expect(delay).toBeLessThanOrEqual(2200);
            }
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Respecting Retry-After header: 2s'));
        }, 5000);
    });
    describe('S3 Error Classification', () => {
        it('should classify S3 errors as retryable (500, 503)', () => {
            const error500 = new Error('Internal Server Error');
            error500.statusCode = 500;
            const error503 = new Error('Service Unavailable');
            error503.statusCode = 503;
            expect(errorHandlingService.isRetryableS3Error(error500)).toBe(true);
            expect(errorHandlingService.isRetryableS3Error(error503)).toBe(true);
        });
        it('should classify S3 errors as non-retryable (400, 403, 404)', () => {
            const error400 = new Error('Bad Request');
            error400.statusCode = 400;
            const error403 = new Error('Access Denied');
            error403.statusCode = 403;
            const error404 = new Error('Not Found');
            error404.statusCode = 404;
            expect(errorHandlingService.isRetryableS3Error(error400)).toBe(false);
            expect(errorHandlingService.isRetryableS3Error(error403)).toBe(false);
            expect(errorHandlingService.isRetryableS3Error(error404)).toBe(false);
        });
        it('should handle S3 throttling errors as retryable', () => {
            const throttleError = new Error('SlowDown: Please reduce your request rate');
            expect(errorHandlingService.isRetryableS3Error(throttleError)).toBe(true);
        });
    });
    describe('Fallback Logic', () => {
        it('should trigger fallback after all retries exhausted', async () => {
            let attemptCount = 0;
            const fallbackCalled = jest.fn().mockResolvedValue('fallback-result');
            const operation = jest.fn().mockImplementation(async () => {
                attemptCount++;
                throw new Error('API unavailable');
            });
            const result = await errorHandlingService.executeOpenAIOperation(operation, 'test-fallback', fallbackCalled);
            expect(result).toBe('fallback-result');
            expect(fallbackCalled).toHaveBeenCalledTimes(1);
            expect(attemptCount).toBe(4);
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('All retries failed for OpenAI operation test-fallback, using fallback'));
        }, 10000);
    });
    describe('Comprehensive API Call Logging', () => {
        it('should log operation details before API call', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            await errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-logging'
            });
            expect(operation).toHaveBeenCalled();
        });
        it('should log response time and metadata on success', async () => {
            const operation = jest.fn().mockResolvedValue({ data: 'success' });
            const result = await errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-success-logging'
            });
            expect(result).toEqual({ data: 'success' });
            expect(operation).toHaveBeenCalled();
        });
        it('should log error details on failure', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            await expect(errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-error-logging',
                isRetryable: () => false
            })).rejects.toThrow('Test error');
            expect(consoleWarnSpy).toHaveBeenCalled();
        });
    });
    describe('OpenAI Service Error Handling', () => {
        it('should surface transcription failures (no placeholder fallback)', async () => {
            const mockOpenAI = {
                audio: {
                    transcriptions: {
                        create: jest.fn().mockRejectedValue(new Error('Whisper API failed'))
                    }
                }
            };
            const openaiService = new OpenAIService_1.OpenAIService({
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 60000
            });
            openaiService.whisperClient = mockOpenAI;
            const audioBuffer = Buffer.alloc(2000, 0);
            await expect(openaiService.transcribeAudio(audioBuffer, 'test.wav')).rejects.toThrow(/Transcription temporarily unavailable/i);
        }, 10000);
        it('should handle analysis failures with fallback', async () => {
            const mockOpenAI = {
                chat: {
                    completions: {
                        create: jest.fn().mockRejectedValue(new Error('GPT API failed'))
                    }
                }
            };
            const openaiService = new OpenAIService_1.OpenAIService({
                gptApiKey: 'test-gpt-key',
                whisperApiKey: 'test-whisper-key',
                maxRetries: 3,
                timeout: 60000
            });
            openaiService.gptClient = mockOpenAI;
            const userContext = {
                profile: {
                    id: 'test-user',
                    userId: 'test-user',
                    fullName: null,
                    currentJobTitle: null,
                    currentCompany: null,
                    school: null,
                    degreeInfo: null,
                    previousJobTitles: [],
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Software Engineer',
                    experienceLevel: 'mid',
                    extractedSkills: ['JavaScript', 'TypeScript'],
                    aiAttributes: null,
                    resumeS3Key: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };
            const { analysis: result } = await openaiService.analyzeResponse('This is a test transcript with some content', userContext);
            expect(result.feedback).toContain('Based on basic analysis');
            expect(result.scores.clarity).toBeGreaterThanOrEqual(1);
            expect(result.scores.clarity).toBeLessThanOrEqual(5);
            expect(Array.isArray(result.strengthAreas)).toBe(true);
            expect(Array.isArray(result.strengthInsights)).toBe(true);
            expect(Array.isArray(result.opportunityAreas)).toBe(true);
            expect(Array.isArray(result.opportunityInsights)).toBe(true);
            expect(Array.isArray(result.topTraits)).toBe(true);
            expect(result.topTraits.length).toBeGreaterThanOrEqual(2);
            expect(Array.isArray(result.messages)).toBe(true);
            expect(result.messages.length).toBeGreaterThanOrEqual(1);
            expect(result.analysisVersion).toBe(2);
            (result.strengthAreas ?? []).forEach((item) => expect(typeof item).toBe('string'));
            (result.strengthInsights ?? []).forEach((item) => expect(typeof item).toBe('string'));
            (result.opportunityAreas ?? []).forEach((item) => expect(typeof item).toBe('string'));
            (result.opportunityInsights ?? []).forEach((item) => expect(typeof item).toBe('string'));
            (result.topTraits ?? []).forEach((item) => expect(typeof item).toBe('string'));
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('GPT API fallback triggered'), expect.objectContaining({
                fallbackAction: 'Using basic text analysis'
            }));
        }, 10000);
    });
    describe('S3 Service Error Handling', () => {
        it('should retry S3 operations on retryable errors', async () => {
            const s3Config = {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
                region: 'us-east-1',
                bucketName: 'test-bucket'
            };
            const s3Service = new S3Service_1.S3Service(s3Config);
            let attemptCount = 0;
            const mockS3 = {
                upload: jest.fn().mockImplementation(() => ({
                    promise: jest.fn().mockImplementation(async () => {
                        attemptCount++;
                        if (attemptCount < 3) {
                            const error = new Error('Service Unavailable');
                            error.statusCode = 503;
                            throw error;
                        }
                        return { Location: 'https://s3.amazonaws.com/test-bucket/test-key' };
                    })
                }))
            };
            s3Service.s3 = mockS3;
            const result = await s3Service.upload('test-key', Buffer.from('test content'), { contentType: 'text/plain' });
            expect(result).toContain('test-bucket/test-key');
            expect(attemptCount).toBe(3);
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying S3 operation'), expect.anything());
        }, 10000);
        it('should not retry S3 operations on non-retryable errors', async () => {
            const s3Config = {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
                region: 'us-east-1',
                bucketName: 'test-bucket'
            };
            const s3Service = new S3Service_1.S3Service(s3Config);
            let attemptCount = 0;
            const mockS3 = {
                upload: jest.fn().mockImplementation(() => ({
                    promise: jest.fn().mockImplementation(async () => {
                        attemptCount++;
                        const error = new Error('Access Denied');
                        error.statusCode = 403;
                        throw error;
                    })
                }))
            };
            s3Service.s3 = mockS3;
            await expect(s3Service.upload('test-key', Buffer.from('test content'), { contentType: 'text/plain' })).rejects.toThrow('Access Denied');
            expect(attemptCount).toBe(1);
        }, 10000);
    });
    describe('Error Logging Verification', () => {
        it('should log all required information for API operations', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            await errorHandlingService.retryWithBackoff(operation, {
                operationName: 'test-comprehensive-logging'
            });
            expect(operation).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=error-handling-retry.integration.test.js.map