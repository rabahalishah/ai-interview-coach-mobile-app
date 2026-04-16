import { UserProfile, ProfileService as IProfileService, ProfileUpdateData } from '../types/auth';
import { S3Service } from './S3Service';
import { OpenAIService, ResumeData } from './OpenAIService';
import { PrismaClient } from '@prisma/client';
export declare class ProfileService implements IProfileService {
    private s3Service;
    private openaiService?;
    private prismaInstance?;
    private resumeTextExtractor;
    constructor(s3Service: S3Service, openaiService?: OpenAIService | undefined, prismaInstance?: PrismaClient | undefined);
    private get prisma();
    getProfile(userId: string): Promise<UserProfile>;
    updateProfile(userId: string, data: ProfileUpdateData): Promise<UserProfile>;
    uploadResume(userId: string, file: Buffer, filename: string): Promise<string>;
    extractStructuredResumeData(extractedText: string): Promise<ResumeData>;
    getResumePlainTextForUser(userId: string): Promise<string | null>;
    uploadResumeStorageOnly(userId: string, file: Buffer, filename: string): Promise<string>;
    processResumeFromText(userId: string, extractedText: string): Promise<void>;
    processResume(userId: string, s3Key: string): Promise<void>;
    setTargetRole(userId: string, industry: string, jobTitle: string): Promise<void>;
    deleteProfile(userId: string): Promise<void>;
    storeAIAttributes(userId: string, attributes: Record<string, any>): Promise<void>;
    getAIAttributes(userId: string): Promise<Record<string, any>>;
    getResumeUrl(userId: string, expiresIn?: number): Promise<string>;
    private extractResumeDataWithKeywords;
    private validateTargetRole;
    private validateResumeData;
    private convertDbProfileToProfile;
    getAvailableIndustries(): Promise<Array<{
        name: string;
        jobTitles: string[];
    }>>;
    createProfile(userId: string): Promise<UserProfile>;
}
//# sourceMappingURL=ProfileService.d.ts.map