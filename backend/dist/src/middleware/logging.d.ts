import { Request, Response, NextFunction } from 'express';
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const performanceMonitor: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiVersioning: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestTimeout: (timeoutMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const healthCheck: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=logging.d.ts.map