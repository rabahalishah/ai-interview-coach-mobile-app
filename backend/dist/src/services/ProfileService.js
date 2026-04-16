"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const auth_1 = require("../types/auth");
const validation_1 = require("../utils/validation");
const ResumeTextExtractor_1 = require("./ResumeTextExtractor");
const constants_1 = require("../utils/constants");
const fileUpload_1 = require("../utils/fileUpload");
const prisma_1 = __importDefault(require("../lib/prisma"));
class ProfileService {
    constructor(s3Service, openaiService, prismaInstance) {
        this.s3Service = s3Service;
        this.openaiService = openaiService;
        this.prismaInstance = prismaInstance;
        this.resumeTextExtractor = new ResumeTextExtractor_1.ResumeTextExtractor();
    }
    get prisma() {
        return this.prismaInstance || prisma_1.default;
    }
    async getProfile(userId) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            const dbProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!dbProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            return this.convertDbProfileToProfile(dbProfile);
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to get profile', { error: error.message });
        }
    }
    async updateProfile(userId, data) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            const validatedData = validation_1.ValidationUtils.validate(data, validation_1.profileSchemas.updateProfile);
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!existingProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            if (validatedData.targetIndustry || validatedData.targetJobTitle) {
                await this.validateTargetRole(validatedData.targetIndustry || existingProfile.targetIndustry, validatedData.targetJobTitle || existingProfile.targetJobTitle);
            }
            const updateData = {};
            if (validatedData.fullName !== undefined) {
                updateData.fullName = validatedData.fullName;
            }
            if (validatedData.currentJobTitle !== undefined) {
                updateData.currentJobTitle = validatedData.currentJobTitle;
            }
            if (validatedData.currentCompany !== undefined) {
                updateData.currentCompany = validatedData.currentCompany;
            }
            if (validatedData.school !== undefined) {
                updateData.school = validatedData.school;
            }
            if (validatedData.degreeInfo !== undefined) {
                updateData.degreeInfo = validatedData.degreeInfo;
            }
            if (validatedData.previousJobTitles !== undefined) {
                updateData.previousJobTitles = validatedData.previousJobTitles;
            }
            if (validatedData.targetIndustry !== undefined) {
                updateData.targetIndustry = validatedData.targetIndustry;
            }
            if (validatedData.targetJobTitle !== undefined) {
                updateData.targetJobTitle = validatedData.targetJobTitle;
            }
            if (validatedData.experienceLevel !== undefined) {
                updateData.experienceLevel = validatedData.experienceLevel;
            }
            const updatedProfile = await this.prisma.userProfile.update({
                where: { userId },
                data: updateData
            });
            return this.convertDbProfileToProfile(updatedProfile);
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to update profile', { error: error.message });
        }
    }
    async uploadResume(userId, file, filename) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            if (!file || file.length === 0) {
                throw new auth_1.ValidationError('File is required');
            }
            if (!filename) {
                throw new auth_1.ValidationError('Filename is required');
            }
            (0, fileUpload_1.validateFileBuffer)(file, filename, {
                allowedTypes: constants_1.S3_CONFIG.ALLOWED_FILE_TYPES,
                maxSizeBytes: constants_1.S3_CONFIG.MAX_FILE_SIZE
            });
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!existingProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            let extractedText;
            try {
                extractedText = await this.resumeTextExtractor.extractText(file, filename);
            }
            catch (error) {
                const errorMessage = `Failed to extract text from resume file ${filename}: ${error.message}`;
                console.error(errorMessage, error);
                throw new auth_1.ExternalServiceError(errorMessage);
            }
            const sanitizedFilename = (0, fileUpload_1.sanitizeFilename)(filename);
            const s3Key = this.s3Service.generateFileKey(constants_1.S3_CONFIG.RESUME_PREFIX, userId, sanitizedFilename);
            const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
            const contentType = (0, fileUpload_1.getContentTypeFromExtension)(fileExtension);
            await this.s3Service.upload(s3Key, file, {
                contentType,
                metadata: {
                    userId,
                    originalFilename: filename,
                    uploadedAt: new Date().toISOString()
                }
            });
            if (existingProfile.resumeS3Key) {
                try {
                    await this.s3Service.deleteFile(existingProfile.resumeS3Key);
                }
                catch (error) {
                    console.warn(`Failed to delete old resume file: ${existingProfile.resumeS3Key}`, error);
                }
            }
            try {
                await this.processResumeFromText(userId, extractedText);
            }
            catch (error) {
                console.error(`Failed to process resume for user ${userId}:`, error);
            }
            await this.prisma.userProfile.update({
                where: { userId },
                data: { resumeS3Key: s3Key }
            });
            return s3Key;
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to upload resume', { error: error.message });
        }
    }
    async extractStructuredResumeData(extractedText) {
        if (!extractedText || extractedText.trim().length === 0) {
            throw new auth_1.ValidationError('Extracted text is required');
        }
        if (!this.openaiService) {
            throw new auth_1.ExternalServiceError('OpenAI service not available');
        }
        try {
            const resumeData = await this.openaiService.extractResumeData(extractedText);
            this.validateResumeData(resumeData);
            return resumeData;
        }
        catch (error) {
            console.warn(`GPT extraction failed, using keyword fallback. Reason: ${error.message}`, error);
            return this.extractResumeDataWithKeywords(extractedText);
        }
    }
    async getResumePlainTextForUser(userId) {
        if (!validation_1.ValidationUtils.isValidUUID(userId)) {
            throw new auth_1.ValidationError('Invalid user ID format');
        }
        const p = await this.prisma.userProfile.findUnique({
            where: { userId },
            select: { resumeS3Key: true }
        });
        if (!p?.resumeS3Key) {
            return null;
        }
        const fileBuffer = await this.s3Service.download(p.resumeS3Key);
        const filename = p.resumeS3Key.split('/').pop() || 'resume.pdf';
        return await this.resumeTextExtractor.extractText(fileBuffer, filename);
    }
    async uploadResumeStorageOnly(userId, file, filename) {
        if (!validation_1.ValidationUtils.isValidUUID(userId)) {
            throw new auth_1.ValidationError('Invalid user ID format');
        }
        if (!file?.length) {
            throw new auth_1.ValidationError('File is required');
        }
        if (!filename) {
            throw new auth_1.ValidationError('Filename is required');
        }
        (0, fileUpload_1.validateFileBuffer)(file, filename, {
            allowedTypes: constants_1.S3_CONFIG.ALLOWED_FILE_TYPES,
            maxSizeBytes: constants_1.S3_CONFIG.MAX_FILE_SIZE
        });
        const existingProfile = await this.prisma.userProfile.findUnique({
            where: { userId }
        });
        if (!existingProfile) {
            throw new auth_1.NotFoundError('Profile not found');
        }
        const sanitizedFilename = (0, fileUpload_1.sanitizeFilename)(filename);
        const s3Key = this.s3Service.generateFileKey(constants_1.S3_CONFIG.RESUME_PREFIX, userId, sanitizedFilename);
        const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        const contentType = (0, fileUpload_1.getContentTypeFromExtension)(fileExtension);
        await this.s3Service.upload(s3Key, file, {
            contentType,
            metadata: {
                userId,
                originalFilename: filename,
                uploadedAt: new Date().toISOString()
            }
        });
        if (existingProfile.resumeS3Key) {
            try {
                await this.s3Service.deleteFile(existingProfile.resumeS3Key);
            }
            catch (e) {
                console.warn(`Failed to delete old resume: ${existingProfile.resumeS3Key}`, e);
            }
        }
        await this.prisma.userProfile.update({
            where: { userId },
            data: { resumeS3Key: s3Key }
        });
        return s3Key;
    }
    async processResumeFromText(userId, extractedText) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            if (!extractedText || extractedText.trim().length === 0) {
                throw new auth_1.ValidationError('Extracted text is required');
            }
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!existingProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            const resumeData = await this.extractStructuredResumeData(extractedText);
            const updateData = {
                extractedSkills: resumeData.skills,
                experienceLevel: resumeData.experienceLevel
            };
            if (resumeData.fullName) {
                updateData.fullName = resumeData.fullName;
            }
            if (resumeData.currentJobTitle) {
                updateData.currentJobTitle = resumeData.currentJobTitle;
            }
            if (resumeData.currentCompany) {
                updateData.currentCompany = resumeData.currentCompany;
            }
            if (resumeData.school) {
                updateData.school = resumeData.school;
            }
            if (resumeData.degreeInfo) {
                updateData.degreeInfo = resumeData.degreeInfo;
            }
            if (resumeData.previousJobTitles && resumeData.previousJobTitles.length > 0) {
                updateData.previousJobTitles = resumeData.previousJobTitles;
            }
            await this.prisma.userProfile.update({
                where: { userId },
                data: updateData
            });
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to process resume', { error: error.message });
        }
    }
    async processResume(userId, s3Key) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            if (!s3Key) {
                throw new auth_1.ValidationError('S3 key is required');
            }
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!existingProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            const fileBuffer = await this.s3Service.download(s3Key);
            const filename = s3Key.split('/').pop() || s3Key;
            let extractedText;
            try {
                extractedText = await this.resumeTextExtractor.extractText(fileBuffer, filename);
            }
            catch (error) {
                const errorMessage = `Failed to extract text from resume file ${filename}: ${error.message}`;
                console.error(errorMessage, error);
                throw new auth_1.ExternalServiceError(errorMessage);
            }
            if (!this.openaiService) {
                throw new auth_1.ExternalServiceError('OpenAI service not available');
            }
            let resumeData;
            try {
                resumeData = await this.openaiService.extractResumeData(extractedText);
                this.validateResumeData(resumeData);
            }
            catch (error) {
                console.warn(`GPT extraction failed for user ${userId}, using keyword extraction fallback. ` +
                    `Reason: ${error.message}`, error);
                resumeData = this.extractResumeDataWithKeywords(extractedText);
            }
            await this.prisma.userProfile.update({
                where: { userId },
                data: {
                    extractedSkills: resumeData.skills,
                    experienceLevel: resumeData.experienceLevel
                }
            });
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to process resume', { error: error.message });
        }
    }
    async setTargetRole(userId, industry, jobTitle) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            const validatedData = validation_1.ValidationUtils.validate({ industry, jobTitle }, validation_1.profileSchemas.targetRole);
            await this.validateTargetRole(validatedData.industry, validatedData.jobTitle);
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!existingProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            await this.prisma.userProfile.update({
                where: { userId },
                data: {
                    targetIndustry: validatedData.industry,
                    targetJobTitle: validatedData.jobTitle
                }
            });
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to set target role', { error: error.message });
        }
    }
    async deleteProfile(userId) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!existingProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            if (existingProfile.resumeS3Key) {
                try {
                    await this.s3Service.deleteFile(existingProfile.resumeS3Key);
                }
                catch (error) {
                    console.warn(`Failed to delete resume file from S3: ${existingProfile.resumeS3Key}`, error);
                }
            }
            await this.prisma.userProfile.delete({
                where: { userId }
            });
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to delete profile', { error: error.message });
        }
    }
    async storeAIAttributes(userId, attributes) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            if (!attributes || typeof attributes !== 'object') {
                throw new auth_1.ValidationError('AI attributes must be a valid object');
            }
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!existingProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            const updatedAttributes = {
                ...existingProfile.aiAttributes,
                ...attributes,
                lastUpdated: new Date().toISOString()
            };
            await this.prisma.userProfile.update({
                where: { userId },
                data: { aiAttributes: updatedAttributes }
            });
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to store AI attributes', { error: error.message });
        }
    }
    async getAIAttributes(userId) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            const dbProfile = await this.prisma.userProfile.findUnique({
                where: { userId },
                select: { aiAttributes: true }
            });
            if (!dbProfile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            return dbProfile.aiAttributes;
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to get AI attributes', { error: error.message });
        }
    }
    async getResumeUrl(userId, expiresIn = constants_1.S3_CONFIG.SIGNED_URL_EXPIRES) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            const profile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (!profile) {
                throw new auth_1.NotFoundError('Profile not found');
            }
            if (!profile.resumeS3Key) {
                throw new auth_1.NotFoundError('No resume file found for this user');
            }
            return await this.s3Service.getSignedUrl(profile.resumeS3Key, expiresIn);
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError || error instanceof auth_1.NotFoundError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to generate resume URL', { error: error.message });
        }
    }
    extractResumeDataWithKeywords(text) {
        const lowerText = text.toLowerCase();
        const skillKeywords = [
            'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
            'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
            'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd',
            'html', 'css', 'rest', 'api', 'graphql', 'microservices', 'agile', 'scrum',
            'machine learning', 'ai', 'data science', 'analytics', 'testing', 'security'
        ];
        const extractedSkills = skillKeywords.filter(skill => lowerText.includes(skill.toLowerCase()));
        let experienceLevel = 'entry';
        if (lowerText.includes('senior') || lowerText.includes('lead') || lowerText.includes('principal')) {
            experienceLevel = 'senior';
        }
        else if (lowerText.includes('mid-level') || lowerText.includes('intermediate') ||
            (lowerText.match(/\d+\s*years?/g) && parseInt(lowerText.match(/\d+/)?.[0] || '0') >= 3)) {
            experienceLevel = 'mid';
        }
        const industryKeywords = [
            'technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing',
            'consulting', 'media', 'telecommunications', 'energy', 'transportation'
        ];
        const extractedIndustries = industryKeywords.filter(industry => lowerText.includes(industry.toLowerCase()));
        const jobTitleKeywords = [
            'software engineer', 'developer', 'programmer', 'architect', 'manager',
            'analyst', 'designer', 'consultant', 'specialist', 'administrator',
            'data scientist', 'devops', 'qa engineer', 'product manager', 'project manager'
        ];
        const extractedJobTitles = jobTitleKeywords.filter(title => lowerText.includes(title.toLowerCase()));
        const summary = `Resume processed with keyword extraction. Found ${extractedSkills.length} skills. ` +
            `Experience level: ${experienceLevel}.`;
        return {
            skills: extractedSkills.length > 0 ? extractedSkills : ['general'],
            experienceLevel,
            industries: extractedIndustries.length > 0 ? extractedIndustries : ['technology'],
            jobTitles: extractedJobTitles.length > 0 ? extractedJobTitles : ['professional'],
            summary
        };
    }
    async validateTargetRole(industry, jobTitle) {
        return;
    }
    validateResumeData(resumeData) {
        if (!resumeData) {
            throw new auth_1.ValidationError('Resume data is required');
        }
        if (!Array.isArray(resumeData.skills)) {
            throw new auth_1.ValidationError('Resume data must contain skills array');
        }
        if (typeof resumeData.experienceLevel !== 'string' || !resumeData.experienceLevel) {
            throw new auth_1.ValidationError('Resume data must contain experienceLevel string');
        }
        if (!Array.isArray(resumeData.industries)) {
            throw new auth_1.ValidationError('Resume data must contain industries array');
        }
        if (!Array.isArray(resumeData.jobTitles)) {
            throw new auth_1.ValidationError('Resume data must contain jobTitles array');
        }
        if (typeof resumeData.summary !== 'string') {
            throw new auth_1.ValidationError('Resume data must contain summary string');
        }
    }
    convertDbProfileToProfile(dbProfile) {
        const profile = {
            id: dbProfile.id,
            userId: dbProfile.userId,
            aiAttributes: dbProfile.aiAttributes,
            extractedSkills: dbProfile.extractedSkills,
            previousJobTitles: dbProfile.previousJobTitles,
            createdAt: dbProfile.createdAt,
            updatedAt: dbProfile.updatedAt
        };
        if (dbProfile.fullName) {
            profile.fullName = dbProfile.fullName;
        }
        if (dbProfile.currentJobTitle) {
            profile.currentJobTitle = dbProfile.currentJobTitle;
        }
        if (dbProfile.currentCompany) {
            profile.currentCompany = dbProfile.currentCompany;
        }
        if (dbProfile.school) {
            profile.school = dbProfile.school;
        }
        if (dbProfile.degreeInfo) {
            profile.degreeInfo = dbProfile.degreeInfo;
        }
        if (dbProfile.resumeS3Key) {
            profile.resumeS3Key = dbProfile.resumeS3Key;
        }
        if (dbProfile.targetIndustry) {
            profile.targetIndustry = dbProfile.targetIndustry;
        }
        if (dbProfile.targetJobTitle) {
            profile.targetJobTitle = dbProfile.targetJobTitle;
        }
        if (dbProfile.experienceLevel) {
            profile.experienceLevel = dbProfile.experienceLevel;
        }
        return profile;
    }
    async getAvailableIndustries() {
        try {
            const industries = await this.prisma.industry.findMany({
                select: {
                    name: true,
                    jobTitles: true
                }
            });
            return industries.map(industry => ({
                name: industry.name,
                jobTitles: industry.jobTitles
            }));
        }
        catch (error) {
            throw new auth_1.ExternalServiceError('Failed to get available industries', { error: error.message });
        }
    }
    async createProfile(userId) {
        try {
            if (!validation_1.ValidationUtils.isValidUUID(userId)) {
                throw new auth_1.ValidationError('Invalid user ID format');
            }
            const existingProfile = await this.prisma.userProfile.findUnique({
                where: { userId }
            });
            if (existingProfile) {
                throw new auth_1.ValidationError('Profile already exists for this user');
            }
            const dbProfile = await this.prisma.userProfile.create({
                data: {
                    userId,
                    aiAttributes: {},
                    extractedSkills: []
                }
            });
            return this.convertDbProfileToProfile(dbProfile);
        }
        catch (error) {
            if (error instanceof auth_1.ValidationError) {
                throw error;
            }
            throw new auth_1.ExternalServiceError('Failed to create profile', { error: error.message });
        }
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=ProfileService.js.map