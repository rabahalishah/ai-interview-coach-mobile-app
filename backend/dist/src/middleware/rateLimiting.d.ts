import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}
export declare const createRateLimit: (config: RateLimitConfig) => (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const passwordResetRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const aiProcessingRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const progressiveRateLimit: (baseConfig: RateLimitConfig) => (req: Request, res: Response, next: NextFunction) => void;
export declare class RedisRateLimit {
    private redisClient;
    constructor(redisClient: any);
    createRateLimit(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const abuseDetection: (req: Request, res: Response, next: NextFunction) => void;
export declare const ipFilter: (options: {
    whitelist?: string[];
    blacklist?: string[];
}) => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=rateLimiting.d.ts.map