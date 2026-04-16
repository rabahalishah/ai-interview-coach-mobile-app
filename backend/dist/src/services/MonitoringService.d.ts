export declare class MonitoringService {
    private static instance;
    private metrics;
    private alerts;
    private openaiClient;
    private s3Client;
    private intervals;
    private apiMetrics;
    private constructor();
    static getInstance(): MonitoringService;
    private startPeriodicMonitoring;
    stopPeriodicMonitoring(): void;
    collectSystemMetrics(): Promise<void>;
    private getSystemMetrics;
    private getDatabaseMetrics;
    private getApplicationMetrics;
    private getPerformanceMetrics;
    performHealthChecks(): Promise<{
        status: string;
        checks: any;
    }>;
    private checkDatabaseHealth;
    private checkExternalServicesHealth;
    private checkOpenAIHealth;
    private checkAWSHealth;
    private checkSystemResourcesHealth;
    private checkConfigurationHealth;
    private determineOverallHealth;
    private checkForAlerts;
    private addAlert;
    getRecentMetrics(limit?: number): any[];
    getRecentAlerts(limit?: number): any[];
    private cleanupOldMetrics;
    private cleanupOldAlerts;
    getSystemStatus(): Promise<any>;
    recordAPIOperation(service: 'openai' | 's3', success: boolean, responseTime: number, errorType?: string): void;
    getAPIMetrics(): any;
    private calculateServiceMetrics;
    resetAPIMetrics(): void;
}
export declare const monitoringService: MonitoringService;
//# sourceMappingURL=MonitoringService.d.ts.map