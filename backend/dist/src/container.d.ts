import { PrismaClient } from '@prisma/client';
import { AuthService } from './services/AuthService';
import { ProfileService } from './services/ProfileService';
import { OnboardingService } from './services/OnboardingService';
import { AudioSessionService } from './services/AudioSessionService';
import { SubscriptionService } from './services/SubscriptionService';
import { DashboardService } from './services/DashboardService';
import { OpenAIService } from './services/OpenAIService';
import { S3Service } from './services/S3Service';
import { monitoringService } from './services/MonitoringService';
import { ErrorHandlingService } from './services/ErrorHandlingService';
export interface ServiceContainer {
    prisma: PrismaClient;
    authService: AuthService;
    profileService: ProfileService;
    onboardingService: OnboardingService;
    audioSessionService: AudioSessionService;
    subscriptionService: SubscriptionService;
    dashboardService: DashboardService;
    openaiService: OpenAIService;
    s3Service: S3Service;
    monitoringService: typeof monitoringService;
    errorHandlingService: ErrorHandlingService;
}
declare class Container {
    private static instance;
    private services;
    private constructor();
    static getInstance(): Container;
    initialize(): Promise<ServiceContainer>;
    getServices(): ServiceContainer;
    cleanup(): Promise<void>;
}
export declare const container: Container;
export default container;
//# sourceMappingURL=container.d.ts.map