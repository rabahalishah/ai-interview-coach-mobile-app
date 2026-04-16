export interface JWTPayload {
    userId: string;
    email: string;
    subscriptionTier: string;
    emailVerified: boolean;
    iat?: number;
    exp?: number;
}
export interface ResetTokenPayload {
    email: string;
    purpose: 'password_reset';
    iat?: number;
    exp?: number;
}
export interface JWTConfig {
    secret: string;
    expiresIn: string;
    issuer: string;
}
declare class JWTUtils {
    private config;
    constructor();
    generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
    validateToken(token: string): JWTPayload;
    decodeToken(token: string): JWTPayload | null;
    extractTokenFromHeader(authHeader: string | undefined): string | null;
    isTokenExpired(token: string): boolean;
    refreshToken(token: string): string;
    getTokenExpiration(token: string): Date | null;
    generateResetToken(email: string): string;
    validateResetToken(token: string): ResetTokenPayload;
}
export declare const jwtUtils: JWTUtils;
export declare const generateToken: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
export declare const validateToken: (token: string) => JWTPayload;
export declare const generateResetToken: (email: string) => string;
export declare const validateResetToken: (token: string) => ResetTokenPayload;
export declare const decodeToken: (token: string) => JWTPayload | null;
export declare const extractTokenFromHeader: (authHeader: string | undefined) => string | null;
export declare const isTokenExpired: (token: string) => boolean;
export declare const refreshToken: (token: string) => string;
export declare const getTokenExpiration: (token: string) => Date | null;
export {};
//# sourceMappingURL=jwt.d.ts.map