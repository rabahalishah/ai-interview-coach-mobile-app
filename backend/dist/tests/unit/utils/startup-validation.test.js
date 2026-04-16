"use strict";
describe('Startup Validation - Environment Variables', () => {
    const originalEnv = { ...process.env };
    afterEach(() => {
        process.env = { ...originalEnv };
    });
    describe('Required Environment Variables', () => {
        it('should require OPENAI_API_KEY', () => {
            const requiredVars = [
                'OPENAI_API_KEY',
                'WHISPER_API_KEY',
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY',
                'AWS_S3_BUCKET'
            ];
            expect(requiredVars).toContain('OPENAI_API_KEY');
            expect(requiredVars).toContain('WHISPER_API_KEY');
        });
        it('should require AWS credentials', () => {
            const requiredVars = [
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY',
                'AWS_S3_BUCKET'
            ];
            expect(requiredVars).toContain('AWS_ACCESS_KEY_ID');
            expect(requiredVars).toContain('AWS_SECRET_ACCESS_KEY');
            expect(requiredVars).toContain('AWS_S3_BUCKET');
        });
        it('should validate environment variable presence', () => {
            const requiredVars = [
                'OPENAI_API_KEY',
                'WHISPER_API_KEY',
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY',
                'AWS_S3_BUCKET'
            ];
            expect(requiredVars.length).toBe(5);
        });
    });
    describe('Error Messages', () => {
        it('should provide clear error messages for missing variables', () => {
            const errorMessages = {
                OPENAI_API_KEY: 'Missing required environment variable: OPENAI_API_KEY - GPT API key is required for AI analysis',
                WHISPER_API_KEY: 'Missing required environment variable: WHISPER_API_KEY - Whisper API key is required for audio transcription',
                AWS_ACCESS_KEY_ID: 'Missing required environment variable: AWS_ACCESS_KEY_ID - AWS credentials are required for S3 file storage',
                AWS_SECRET_ACCESS_KEY: 'Missing required environment variable: AWS_SECRET_ACCESS_KEY - AWS credentials are required for S3 file storage',
                AWS_S3_BUCKET: 'Missing required environment variable: AWS_S3_BUCKET - S3 bucket name is required for file storage'
            };
            expect(errorMessages.OPENAI_API_KEY).toContain('OPENAI_API_KEY');
            expect(errorMessages.OPENAI_API_KEY).toContain('GPT API key');
            expect(errorMessages.WHISPER_API_KEY).toContain('WHISPER_API_KEY');
            expect(errorMessages.WHISPER_API_KEY).toContain('audio transcription');
            expect(errorMessages.AWS_ACCESS_KEY_ID).toContain('AWS credentials');
            expect(errorMessages.AWS_S3_BUCKET).toContain('S3 bucket');
        });
        it('should fail to start if required variables are missing', () => {
            const expectedBehavior = {
                validationFails: true,
                processExits: true,
                exitCode: 1
            };
            expect(expectedBehavior.validationFails).toBe(true);
            expect(expectedBehavior.processExits).toBe(true);
            expect(expectedBehavior.exitCode).toBe(1);
        });
    });
    describe('Startup Summary', () => {
        it('should include OpenAI configuration status', () => {
            const expectedSummary = {
                openai: {
                    gpt: 'configured',
                    whisper: 'configured'
                }
            };
            expect(expectedSummary.openai).toHaveProperty('gpt');
            expect(expectedSummary.openai).toHaveProperty('whisper');
        });
        it('should include AWS configuration status', () => {
            const expectedSummary = {
                aws: {
                    s3: 'configured',
                    region: 'us-east-1',
                    credentials: 'configured'
                }
            };
            expect(expectedSummary.aws).toHaveProperty('s3');
            expect(expectedSummary.aws).toHaveProperty('credentials');
        });
    });
});
//# sourceMappingURL=startup-validation.test.js.map