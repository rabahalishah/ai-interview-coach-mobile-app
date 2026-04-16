"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ProfileService_1 = require("@/services/ProfileService");
const ResumeTextExtractor_1 = require("@/services/ResumeTextExtractor");
const auth_1 = require("@/types/auth");
jest.mock('@/utils/validation', () => ({
    ValidationUtils: {
        isValidUUID: jest.fn(),
        validate: jest.fn(),
    },
    profileSchemas: {
        updateProfile: {},
        targetRole: {},
    },
}));
jest.mock('@/lib/prisma', () => ({
    userProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    industry: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
}));
jest.mock('@/services/ResumeTextExtractor', () => ({
    ResumeTextExtractor: jest.fn().mockImplementation(() => ({
        extractText: jest.fn().mockResolvedValue('Extracted resume text content'),
        isSupported: jest.fn().mockReturnValue(true),
        getSupportedExtensions: jest.fn().mockReturnValue(['.pdf', '.doc', '.docx'])
    }))
}));
const mockS3Service = {
    upload: jest.fn(),
    download: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
    generateFileKey: jest.fn((prefix, userId, filename) => {
        return `${prefix}/${userId}/${Date.now()}_${filename}`;
    }),
    validateFile: jest.fn(),
    fileExists: jest.fn(),
    healthCheck: jest.fn(),
};
const mockOpenAIService = {
    extractResumeData: jest.fn(),
    transcribeAudio: jest.fn(),
    analyzeResponse: jest.fn(),
    generatePersonalizedPrompt: jest.fn(),
};
const validation_1 = require("@/utils/validation");
const prisma_1 = __importDefault(require("@/lib/prisma"));
const mockValidationUtils = validation_1.ValidationUtils;
const mockPrisma = prisma_1.default;
describe('ProfileService Unit Tests', () => {
    let profileService;
    beforeEach(() => {
        profileService = new ProfileService_1.ProfileService(mockS3Service, mockOpenAIService);
        jest.clearAllMocks();
    });
    describe('getProfile', () => {
        it('should successfully get a user profile', async () => {
            const userId = 'user-123';
            const mockDbProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: 'resumes/user-123/resume.pdf',
                targetIndustry: 'Technology',
                targetJobTitle: 'Software Engineer',
                aiAttributes: { preference: 'technical' },
                extractedSkills: ['JavaScript', 'TypeScript'],
                experienceLevel: 'mid',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(mockDbProfile);
            const result = await profileService.getProfile(userId);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(result).toEqual({
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: 'resumes/user-123/resume.pdf',
                targetIndustry: 'Technology',
                targetJobTitle: 'Software Engineer',
                aiAttributes: { preference: 'technical' },
                extractedSkills: ['JavaScript', 'TypeScript'],
                experienceLevel: 'mid',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            });
        });
        it('should throw ValidationError for invalid user ID', async () => {
            const userId = 'invalid-id';
            mockValidationUtils.isValidUUID.mockReturnValue(false);
            await expect(profileService.getProfile(userId))
                .rejects.toThrow(auth_1.ValidationError);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
        });
        it('should throw NotFoundError when profile does not exist', async () => {
            const userId = 'user-123';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(null);
            await expect(profileService.getProfile(userId))
                .rejects.toThrow(auth_1.NotFoundError);
        });
        it('should handle profiles with null optional fields', async () => {
            const userId = 'user-123';
            const mockDbProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: null,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(mockDbProfile);
            const result = await profileService.getProfile(userId);
            expect(result).toEqual({
                id: 'profile-123',
                userId: 'user-123',
                aiAttributes: {},
                extractedSkills: [],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            });
            expect(result.resumeS3Key).toBeUndefined();
            expect(result.targetIndustry).toBeUndefined();
            expect(result.targetJobTitle).toBeUndefined();
            expect(result.experienceLevel).toBeUndefined();
        });
    });
    describe('updateProfile', () => {
        it('should successfully update a user profile', async () => {
            const userId = 'user-123';
            const updateData = {
                targetIndustry: 'Technology',
                targetJobTitle: 'Senior Software Engineer',
                experienceLevel: 'senior'
            };
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: null,
                targetIndustry: 'Finance',
                targetJobTitle: 'Analyst',
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: 'mid',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            const updatedProfile = {
                ...existingProfile,
                targetIndustry: 'Technology',
                targetJobTitle: 'Senior Software Engineer',
                experienceLevel: 'senior',
                updatedAt: new Date('2024-01-02'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockValidationUtils.validate.mockReturnValue(updateData);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockPrisma.userProfile.update.mockResolvedValue(updatedProfile);
            const mockIndustry = {
                id: 'industry-1',
                name: 'Technology',
                jobTitles: ['Software Engineer', 'Senior Software Engineer', 'Tech Lead']
            };
            mockPrisma.industry.findUnique.mockResolvedValue(mockIndustry);
            const result = await profileService.updateProfile(userId, updateData);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockValidationUtils.validate).toHaveBeenCalledWith(updateData, {});
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
                where: { userId },
                data: {
                    targetIndustry: 'Technology',
                    targetJobTitle: 'Senior Software Engineer',
                    experienceLevel: 'senior'
                }
            });
            expect(result.targetIndustry).toBe('Technology');
            expect(result.targetJobTitle).toBe('Senior Software Engineer');
            expect(result.experienceLevel).toBe('senior');
        });
        it('should throw ValidationError for invalid user ID', async () => {
            const userId = 'invalid-id';
            const updateData = { targetIndustry: 'Technology' };
            mockValidationUtils.isValidUUID.mockReturnValue(false);
            await expect(profileService.updateProfile(userId, updateData))
                .rejects.toThrow(auth_1.ValidationError);
        });
        it('should throw NotFoundError when profile does not exist', async () => {
            const userId = 'user-123';
            const updateData = { targetIndustry: 'Technology' };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockValidationUtils.validate.mockReturnValue(updateData);
            mockPrisma.userProfile.findUnique.mockResolvedValue(null);
            await expect(profileService.updateProfile(userId, updateData))
                .rejects.toThrow(auth_1.NotFoundError);
        });
    });
    describe('uploadResume', () => {
        it('should successfully upload a resume file', async () => {
            const userId = 'user-123';
            const file = Buffer.from('fake pdf content');
            const filename = 'resume.pdf';
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: null,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            const mockS3Key = `resumes/${userId}/${Date.now()}_resume.pdf`;
            mockS3Service.generateFileKey.mockReturnValue(mockS3Key);
            mockPrisma.userProfile.update.mockResolvedValue({
                ...existingProfile,
                resumeS3Key: mockS3Key
            });
            const result = await profileService.uploadResume(userId, file, filename);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(result).toBe(mockS3Key);
            expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
                where: { userId },
                data: { resumeS3Key: mockS3Key }
            });
        });
        it('should throw ValidationError for invalid file type', async () => {
            const userId = 'user-123';
            const file = Buffer.from('fake content');
            const filename = 'resume.txt';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            await expect(profileService.uploadResume(userId, file, filename))
                .rejects.toThrow(auth_1.ValidationError);
        });
        it('should throw ValidationError for file size exceeding limit', async () => {
            const userId = 'user-123';
            const file = Buffer.alloc(51 * 1024 * 1024);
            const filename = 'resume.pdf';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            await expect(profileService.uploadResume(userId, file, filename))
                .rejects.toThrow(auth_1.ValidationError);
        });
        it('should throw ValidationError for empty file', async () => {
            const userId = 'user-123';
            const file = Buffer.alloc(0);
            const filename = 'resume.pdf';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            await expect(profileService.uploadResume(userId, file, filename))
                .rejects.toThrow(auth_1.ValidationError);
        });
    });
    describe('processResume', () => {
        it('should successfully process a PDF resume', async () => {
            const userId = 'user-123';
            const s3Key = 'resumes/user-123/resume.pdf';
            const fileBuffer = Buffer.from('fake pdf content');
            const extractedText = 'John Doe\nSoftware Engineer\nSkills: JavaScript, TypeScript, React';
            const resumeData = {
                skills: ['JavaScript', 'TypeScript', 'React'],
                experienceLevel: 'mid',
                industries: ['Technology'],
                jobTitles: ['Software Engineer'],
                summary: 'Experienced software engineer'
            };
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: s3Key,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockS3Service.download.mockResolvedValue(fileBuffer);
            mockOpenAIService.extractResumeData.mockResolvedValue(resumeData);
            mockPrisma.userProfile.update.mockResolvedValue({
                ...existingProfile,
                extractedSkills: resumeData.skills,
                experienceLevel: resumeData.experienceLevel
            });
            await profileService.processResume(userId, s3Key);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(mockS3Service.download).toHaveBeenCalledWith(s3Key);
            expect(mockOpenAIService.extractResumeData).toHaveBeenCalled();
            expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
                where: { userId },
                data: {
                    extractedSkills: resumeData.skills,
                    experienceLevel: resumeData.experienceLevel
                }
            });
        });
        it('should throw ValidationError for invalid user ID', async () => {
            const userId = 'invalid-id';
            const s3Key = 'resumes/user-123/resume.pdf';
            mockValidationUtils.isValidUUID.mockReturnValue(false);
            await expect(profileService.processResume(userId, s3Key))
                .rejects.toThrow(auth_1.ValidationError);
        });
        it('should throw ValidationError for missing S3 key', async () => {
            const userId = 'user-123';
            const s3Key = '';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            await expect(profileService.processResume(userId, s3Key))
                .rejects.toThrow(auth_1.ValidationError);
        });
        it('should throw NotFoundError when profile does not exist', async () => {
            const userId = 'user-123';
            const s3Key = 'resumes/user-123/resume.pdf';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(null);
            await expect(profileService.processResume(userId, s3Key))
                .rejects.toThrow(auth_1.NotFoundError);
        });
        it('should throw ExternalServiceError when OpenAI service is not available', async () => {
            const userId = 'user-123';
            const s3Key = 'resumes/user-123/resume.pdf';
            const fileBuffer = Buffer.from('fake pdf content');
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: s3Key,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            const serviceWithoutOpenAI = new ProfileService_1.ProfileService(mockS3Service);
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockS3Service.download.mockResolvedValue(fileBuffer);
            await expect(serviceWithoutOpenAI.processResume(userId, s3Key))
                .rejects.toThrow(auth_1.ExternalServiceError);
        });
        it('should use keyword extraction fallback when resume data validation fails', async () => {
            const userId = 'user-123';
            const s3Key = 'resumes/user-123/resume.pdf';
            const fileBuffer = Buffer.from('fake pdf content');
            const invalidResumeData = {
                skills: 'not an array',
                experienceLevel: 'mid',
                industries: [],
                jobTitles: [],
                summary: ''
            };
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: s3Key,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockS3Service.download.mockResolvedValue(fileBuffer);
            mockOpenAIService.extractResumeData.mockResolvedValue(invalidResumeData);
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            mockPrisma.userProfile.update.mockResolvedValue({
                ...existingProfile,
                extractedSkills: ['general'],
                experienceLevel: 'entry'
            });
            await profileService.processResume(userId, s3Key);
            expect(consoleWarnSpy).toHaveBeenCalled();
            const warnCall = consoleWarnSpy.mock.calls[0];
            expect(warnCall[0]).toContain('GPT extraction failed');
            expect(warnCall[0]).toContain('keyword extraction fallback');
            consoleWarnSpy.mockRestore();
        });
        it('should throw ExternalServiceError with descriptive message when text extraction fails', async () => {
            const userId = 'user-123';
            const s3Key = 'resumes/user-123/resume.pdf';
            const fileBuffer = Buffer.from('fake pdf content');
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: s3Key,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            const mockExtractor = new ResumeTextExtractor_1.ResumeTextExtractor();
            mockExtractor.extractText.mockRejectedValue(new Error('PDF parsing failed'));
            const serviceWithFailingExtractor = new ProfileService_1.ProfileService(mockS3Service, mockOpenAIService);
            serviceWithFailingExtractor.resumeTextExtractor = mockExtractor;
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockS3Service.download.mockResolvedValue(fileBuffer);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            await expect(serviceWithFailingExtractor.processResume(userId, s3Key))
                .rejects.toThrow(auth_1.ExternalServiceError);
            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorCall = consoleErrorSpy.mock.calls[0];
            expect(errorCall[0]).toContain('Failed to extract text from resume file');
            expect(errorCall[0]).toContain('resume.pdf');
            consoleErrorSpy.mockRestore();
        });
        it('should use keyword extraction fallback when GPT extraction fails', async () => {
            const userId = 'user-123';
            const s3Key = 'resumes/user-123/resume.pdf';
            const fileBuffer = Buffer.from('fake pdf content');
            const extractedText = 'Senior Software Engineer with 5 years experience in JavaScript, TypeScript, React, and Node.js';
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: s3Key,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockS3Service.download.mockResolvedValue(fileBuffer);
            const mockExtractor = new ResumeTextExtractor_1.ResumeTextExtractor();
            mockExtractor.extractText.mockResolvedValue(extractedText);
            const serviceWithExtractor = new ProfileService_1.ProfileService(mockS3Service, mockOpenAIService);
            serviceWithExtractor.resumeTextExtractor = mockExtractor;
            mockOpenAIService.extractResumeData.mockRejectedValue(new Error('OpenAI API rate limit exceeded'));
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            mockPrisma.userProfile.update.mockResolvedValue({
                ...existingProfile,
                extractedSkills: ['javascript', 'typescript', 'react', 'node.js'],
                experienceLevel: 'senior'
            });
            await serviceWithExtractor.processResume(userId, s3Key);
            expect(consoleWarnSpy).toHaveBeenCalled();
            const warnCall = consoleWarnSpy.mock.calls[0];
            expect(warnCall[0]).toContain('GPT extraction failed');
            expect(warnCall[0]).toContain('keyword extraction fallback');
            expect(warnCall[0]).toContain(userId);
            expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
                where: { userId },
                data: expect.objectContaining({
                    extractedSkills: expect.arrayContaining(['javascript', 'typescript', 'react', 'node.js']),
                    experienceLevel: 'senior'
                })
            });
            consoleWarnSpy.mockRestore();
        });
        it('should extract skills using keyword matching in fallback', async () => {
            const userId = 'user-123';
            const s3Key = 'resumes/user-123/resume.pdf';
            const fileBuffer = Buffer.from('fake pdf content');
            const extractedText = 'Python developer with experience in Django, Flask, PostgreSQL, and Docker. Worked in healthcare industry.';
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: s3Key,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockS3Service.download.mockResolvedValue(fileBuffer);
            const mockExtractor = new ResumeTextExtractor_1.ResumeTextExtractor();
            mockExtractor.extractText.mockResolvedValue(extractedText);
            const serviceWithExtractor = new ProfileService_1.ProfileService(mockS3Service, mockOpenAIService);
            serviceWithExtractor.resumeTextExtractor = mockExtractor;
            mockOpenAIService.extractResumeData.mockRejectedValue(new Error('API error'));
            jest.spyOn(console, 'warn').mockImplementation();
            mockPrisma.userProfile.update.mockResolvedValue({
                ...existingProfile,
                extractedSkills: ['python', 'django', 'flask', 'postgresql', 'docker'],
                experienceLevel: 'entry'
            });
            await serviceWithExtractor.processResume(userId, s3Key);
            expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
                where: { userId },
                data: expect.objectContaining({
                    extractedSkills: expect.arrayContaining(['python', 'django', 'flask', 'postgresql', 'docker']),
                    experienceLevel: 'entry'
                })
            });
            jest.restoreAllMocks();
        });
    });
    describe('setTargetRole', () => {
        it('should successfully set target role', async () => {
            const userId = 'user-123';
            const industry = 'Technology';
            const jobTitle = 'Software Engineer';
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: null,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockValidationUtils.validate.mockReturnValue({ industry, jobTitle });
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockPrisma.userProfile.update.mockResolvedValue({
                ...existingProfile,
                targetIndustry: industry,
                targetJobTitle: jobTitle
            });
            await profileService.setTargetRole(userId, industry, jobTitle);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockValidationUtils.validate).toHaveBeenCalledWith({ industry, jobTitle }, {});
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
                where: { userId },
                data: {
                    targetIndustry: industry,
                    targetJobTitle: jobTitle
                }
            });
        });
        it('should throw ValidationError for invalid industry', async () => {
            const userId = 'user-123';
            const industry = 'InvalidIndustry';
            const jobTitle = 'Software Engineer';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockValidationUtils.validate.mockImplementation(() => {
                throw new auth_1.ValidationError('Invalid industry');
            });
            await expect(profileService.setTargetRole(userId, industry, jobTitle))
                .rejects.toThrow(auth_1.ValidationError);
        });
        it('should throw ValidationError for invalid job title for industry', async () => {
            const userId = 'user-123';
            const industry = 'Technology';
            const jobTitle = 'Invalid Job Title';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockValidationUtils.validate.mockImplementation(() => {
                throw new auth_1.ValidationError('Invalid job title');
            });
            await expect(profileService.setTargetRole(userId, industry, jobTitle))
                .rejects.toThrow(auth_1.ValidationError);
        });
    });
    describe('storeAIAttributes', () => {
        it('should successfully store AI attributes', async () => {
            const userId = 'user-123';
            const attributes = { preference: 'technical', style: 'detailed' };
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: null,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: { existing: 'data' },
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockPrisma.userProfile.update.mockResolvedValue(existingProfile);
            const mockDate = new Date('2024-01-02T10:00:00Z');
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString());
            await profileService.storeAIAttributes(userId, attributes);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
                where: { userId },
                data: {
                    aiAttributes: {
                        existing: 'data',
                        preference: 'technical',
                        style: 'detailed',
                        lastUpdated: mockDate.toISOString()
                    }
                }
            });
            jest.restoreAllMocks();
        });
        it('should throw ValidationError for invalid attributes', async () => {
            const userId = 'user-123';
            const attributes = null;
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            await expect(profileService.storeAIAttributes(userId, attributes))
                .rejects.toThrow(auth_1.ValidationError);
        });
    });
    describe('getAIAttributes', () => {
        it('should successfully get AI attributes', async () => {
            const userId = 'user-123';
            const mockProfile = {
                aiAttributes: { preference: 'technical', style: 'detailed' }
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
            const result = await profileService.getAIAttributes(userId);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId },
                select: { aiAttributes: true }
            });
            expect(result).toEqual({ preference: 'technical', style: 'detailed' });
        });
        it('should throw NotFoundError when profile does not exist', async () => {
            const userId = 'user-123';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(null);
            await expect(profileService.getAIAttributes(userId))
                .rejects.toThrow(auth_1.NotFoundError);
        });
    });
    describe('getAvailableIndustries', () => {
        it('should successfully get available industries', async () => {
            const mockIndustries = [
                { name: 'Technology', jobTitles: ['Software Engineer', 'Product Manager'] },
                { name: 'Finance', jobTitles: ['Financial Analyst', 'Investment Banker'] }
            ];
            mockPrisma.industry.findMany.mockResolvedValue(mockIndustries);
            const result = await profileService.getAvailableIndustries();
            expect(mockPrisma.industry.findMany).toHaveBeenCalledWith({
                select: {
                    name: true,
                    jobTitles: true
                }
            });
            expect(result).toEqual(mockIndustries);
        });
    });
    describe('createProfile', () => {
        it('should successfully create a new profile', async () => {
            const userId = 'user-123';
            const mockCreatedProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: null,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(null);
            mockPrisma.userProfile.create.mockResolvedValue(mockCreatedProfile);
            const result = await profileService.createProfile(userId);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(mockPrisma.userProfile.create).toHaveBeenCalledWith({
                data: {
                    userId,
                    aiAttributes: {},
                    extractedSkills: []
                }
            });
            expect(result).toEqual({
                id: 'profile-123',
                userId: 'user-123',
                aiAttributes: {},
                extractedSkills: [],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            });
        });
        it('should throw ValidationError when profile already exists', async () => {
            const userId = 'user-123';
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: null,
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            await expect(profileService.createProfile(userId))
                .rejects.toThrow(auth_1.ValidationError);
        });
    });
    describe('deleteProfile', () => {
        it('should successfully delete a profile', async () => {
            const userId = 'user-123';
            const existingProfile = {
                id: 'profile-123',
                userId: 'user-123',
                resumeS3Key: 'resumes/user-123/resume.pdf',
                targetIndustry: null,
                targetJobTitle: null,
                aiAttributes: {},
                extractedSkills: [],
                experienceLevel: null,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
            mockPrisma.userProfile.delete.mockResolvedValue(existingProfile);
            await profileService.deleteProfile(userId);
            expect(mockValidationUtils.isValidUUID).toHaveBeenCalledWith(userId);
            expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(mockPrisma.userProfile.delete).toHaveBeenCalledWith({
                where: { userId }
            });
        });
        it('should throw NotFoundError when profile does not exist', async () => {
            const userId = 'user-123';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockResolvedValue(null);
            await expect(profileService.deleteProfile(userId))
                .rejects.toThrow(auth_1.NotFoundError);
        });
    });
    describe('error handling', () => {
        it('should wrap database errors in ExternalServiceError', async () => {
            const userId = 'user-123';
            mockValidationUtils.isValidUUID.mockReturnValue(true);
            mockPrisma.userProfile.findUnique.mockRejectedValue(new Error('Database connection failed'));
            await expect(profileService.getProfile(userId))
                .rejects.toThrow(auth_1.ExternalServiceError);
        });
    });
});
//# sourceMappingURL=ProfileService.test.js.map