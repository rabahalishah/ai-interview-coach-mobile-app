export interface EmailServiceConfig {
    resendApiKey?: string;
    fromAddress: string;
    fromName?: string;
}
export interface IEmailService {
    sendOTP(to: string, otp: string): Promise<void>;
    sendEmailVerificationOTP(to: string, otp: string): Promise<void>;
    sendEmailChangeConfirmationOTP(to: string, otp: string): Promise<void>;
    isConfigured(): boolean;
}
export declare class EmailService implements IEmailService {
    private resend;
    private fromAddress;
    private fromName;
    constructor(config: EmailServiceConfig);
    isConfigured(): boolean;
    sendOTP(to: string, otp: string): Promise<void>;
    sendEmailVerificationOTP(to: string, otp: string): Promise<void>;
    sendEmailChangeConfirmationOTP(to: string, otp: string): Promise<void>;
}
export declare function createEmailService(config: EmailServiceConfig): IEmailService;
//# sourceMappingURL=EmailService.d.ts.map