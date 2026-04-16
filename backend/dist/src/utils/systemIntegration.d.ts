import { ServiceContainer } from '../container';
export interface SystemHealthCheck {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    message: string;
    responseTime?: number;
    details?: any;
}
export interface SystemIntegrationReport {
    overall: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    checks: SystemHealthCheck[];
    dependencies: {
        database: SystemHealthCheck;
        externalServices: SystemHealthCheck[];
        serviceContainer: SystemHealthCheck;
    };
}
export declare class SystemIntegrationValidator {
    private services;
    constructor(services: ServiceContainer);
    performHealthCheck(): Promise<SystemIntegrationReport>;
    private checkDatabaseHealth;
    private checkServiceContainer;
    private checkExternalServices;
    private checkOpenAIService;
    private checkS3Service;
    private checkApiEndpoints;
    validateServiceDependencies(): Promise<{
        valid: boolean;
        issues: string[];
        dependencies: Record<string, string[]>;
    }>;
    testRequestResponseFlow(): Promise<{
        success: boolean;
        steps: Array<{
            step: string;
            success: boolean;
            message: string;
            duration: number;
        }>;
    }>;
}
export declare function createSystemIntegrationValidator(services: ServiceContainer): SystemIntegrationValidator;
export declare function quickIntegrationCheck(services: ServiceContainer): Promise<boolean>;
//# sourceMappingURL=systemIntegration.d.ts.map