import { PrismaClient } from '@prisma/client';
import { ProfileService } from './ProfileService';
import { OpenAIService, ResumeData } from './OpenAIService';
import { S3Service } from './S3Service';
import { ProfileUpdateData, UpdateProfileData, UserProfile } from '../types/auth';
export declare function mergeVoiceExtractIntoProfile(current: UpdateProfileData, voiceData: ResumeData): UpdateProfileData;
export interface OnboardingPrimaryInput {
    resumeBuffer?: Buffer;
    resumeFilename?: string;
    manual?: ProfileUpdateData;
}
export declare class OnboardingService {
    private profileService;
    private openaiService;
    private _s3Service;
    private prismaInstance?;
    constructor(profileService: ProfileService, openaiService: OpenAIService, _s3Service: S3Service, prismaInstance?: PrismaClient | undefined);
    private get prisma();
    private assertNotCompleted;
    private hasPrimaryInProfile;
    primary(userId: string, input: OnboardingPrimaryInput): Promise<UserProfile>;
    voice(userId: string, audioBuffer: Buffer, audioFilename: string): Promise<UserProfile>;
    complete(userId: string): Promise<UserProfile>;
}
//# sourceMappingURL=OnboardingService.d.ts.map