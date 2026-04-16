import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
export declare const enforceDataIsolation: (resourceType: "profile" | "session" | "usage") => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdminAccess: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const secureLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const contentSecurityPolicy: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const sessionSecurity: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const validateApiKey: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map