export interface PasswordConfig {
    saltRounds: number;
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
}
declare class PasswordUtils {
    private config;
    constructor();
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    validatePassword(password: string): void;
    generateSecurePassword(length?: number): string;
    needsRehash(hash: string): boolean;
    getPasswordStrength(password: string): number;
    getPasswordStrengthDescription(password: string): string;
}
export declare const passwordUtils: PasswordUtils;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
export declare const validatePassword: (password: string) => void;
export declare const generateSecurePassword: (length?: number) => string;
export declare const needsRehash: (hash: string) => boolean;
export declare const getPasswordStrength: (password: string) => number;
export declare const getPasswordStrengthDescription: (password: string) => string;
export {};
//# sourceMappingURL=password.d.ts.map