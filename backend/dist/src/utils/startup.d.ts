export declare class StartupValidator {
    private static instance;
    private validationResults;
    private constructor();
    static getInstance(): StartupValidator;
    runStartupValidation(): Promise<{
        success: boolean;
        errors: string[];
    }>;
    private validateConfiguration;
    private validateDatabase;
    private validateExternalServices;
    private initializeMonitoring;
    private validateSystemResources;
    getValidationResults(): {
        [key: string]: boolean;
    };
    isFullyValidated(): boolean;
    getStartupSummary(): any;
}
export declare function runStartupValidation(): Promise<{
    success: boolean;
    errors: string[];
}>;
export declare function getStartupValidator(): StartupValidator;
//# sourceMappingURL=startup.d.ts.map