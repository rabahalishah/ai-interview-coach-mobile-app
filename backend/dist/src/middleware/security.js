"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = exports.sessionSecurity = exports.validateRequest = exports.contentSecurityPolicy = exports.secureLogger = exports.requireAdminAccess = exports.enforceDataIsolation = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const enforceDataIsolation = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    error: {
                        code: 'AUTHENTICATION_REQUIRED',
                        message: 'Authentication required for data access'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
                return;
            }
            const userId = req.user.id;
            let resourceOwnerId = null;
            switch (resourceType) {
                case 'profile':
                    const profileUserId = req.params.userId || req.body.userId || userId;
                    if (profileUserId !== userId) {
                        res.status(403).json({
                            error: {
                                code: 'DATA_ISOLATION_VIOLATION',
                                message: 'Access denied - cannot access other user profiles'
                            },
                            timestamp: new Date().toISOString(),
                            path: req.path
                        });
                        return;
                    }
                    break;
                case 'session':
                    const sessionId = req.params.id || req.params.sessionId;
                    if (sessionId) {
                        const session = await prisma_1.default.audioSession.findUnique({
                            where: { id: sessionId },
                            select: { userId: true }
                        });
                        if (!session) {
                            res.status(404).json({
                                error: {
                                    code: 'SESSION_NOT_FOUND',
                                    message: 'Session not found'
                                },
                                timestamp: new Date().toISOString(),
                                path: req.path
                            });
                            return;
                        }
                        if (session.userId !== userId) {
                            res.status(403).json({
                                error: {
                                    code: 'DATA_ISOLATION_VIOLATION',
                                    message: 'Access denied - cannot access other user sessions'
                                },
                                timestamp: new Date().toISOString(),
                                path: req.path
                            });
                            return;
                        }
                    }
                    break;
                case 'usage':
                    const targetUserId = req.params.userId || req.body.userId || userId;
                    if (targetUserId !== userId) {
                        res.status(403).json({
                            error: {
                                code: 'DATA_ISOLATION_VIOLATION',
                                message: 'Access denied - cannot access other user usage data'
                            },
                            timestamp: new Date().toISOString(),
                            path: req.path
                        });
                        return;
                    }
                    break;
                default:
                    res.status(500).json({
                        error: {
                            code: 'INVALID_RESOURCE_TYPE',
                            message: 'Invalid resource type for data isolation'
                        },
                        timestamp: new Date().toISOString(),
                        path: req.path
                    });
                    return;
            }
            next();
        }
        catch (error) {
            console.error('Data isolation error:', error);
            res.status(500).json({
                error: {
                    code: 'DATA_ISOLATION_ERROR',
                    message: 'Error enforcing data isolation'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
        }
    };
};
exports.enforceDataIsolation = enforceDataIsolation;
const requireAdminAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication required for admin access'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        const isAdmin = await verifyAdminStatus(req.user.id, req.user.email);
        if (!isAdmin) {
            console.warn('Unauthorized admin access attempt:', {
                userId: req.user.id,
                email: req.user.email,
                path: req.path,
                method: req.method,
                ip: req.ip,
                timestamp: new Date().toISOString()
            });
            res.status(403).json({
                error: {
                    code: 'ADMIN_ACCESS_DENIED',
                    message: 'Admin privileges required'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        console.log('Admin access granted:', {
            userId: req.user.id,
            email: req.user.email,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });
        next();
    }
    catch (error) {
        console.error('Admin verification error:', error);
        res.status(500).json({
            error: {
                code: 'ADMIN_VERIFICATION_ERROR',
                message: 'Error verifying admin status'
            },
            timestamp: new Date().toISOString(),
            path: req.path
        });
    }
};
exports.requireAdminAccess = requireAdminAccess;
async function verifyAdminStatus(userId, email) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (adminEmails.includes(email)) {
        return true;
    }
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });
        const adminDomains = process.env.ADMIN_DOMAINS?.split(',').map(d => d.trim()) || [];
        const emailDomain = email.split('@')[1];
        if (adminDomains.includes(emailDomain)) {
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Database admin check failed:', error);
        return false;
    }
}
const secureLogger = (req, res, next) => {
    const startTime = Date.now();
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        query: sanitizeQueryParams(req.query),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
    };
    console.log('Secure Request Log:', JSON.stringify(logData));
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        const duration = Date.now() - startTime;
        const responseLog = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.id,
            success: res.statusCode < 400
        };
        if (res.statusCode >= 400) {
            console.warn('Secure Response Log (Error):', JSON.stringify(responseLog));
        }
        else {
            console.log('Secure Response Log:', JSON.stringify(responseLog));
        }
        return originalJson(body);
    };
    next();
};
exports.secureLogger = secureLogger;
function sanitizeQueryParams(query) {
    const sanitized = { ...query };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    for (const key in sanitized) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        }
    }
    return sanitized;
}
const contentSecurityPolicy = (req, res, next) => {
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.openai.com https://*.amazonaws.com",
        "media-src 'self' https://*.amazonaws.com",
        "object-src 'none'",
        "child-src 'none'",
        "worker-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "manifest-src 'self'"
    ];
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    next();
};
exports.contentSecurityPolicy = contentSecurityPolicy;
const validateRequest = (req, res, next) => {
    const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
    for (const header of suspiciousHeaders) {
        if (req.get(header)) {
            console.warn('Suspicious header detected:', {
                header,
                value: req.get(header),
                ip: req.ip,
                path: req.path,
                timestamp: new Date().toISOString()
            });
        }
    }
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        const allowedTypes = [
            'application/json',
            'multipart/form-data',
            'application/x-www-form-urlencoded'
        ];
        if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
            res.status(400).json({
                error: {
                    code: 'INVALID_CONTENT_TYPE',
                    message: 'Invalid content type'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    }
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = 50 * 1024 * 1024;
    if (contentLength > maxSize) {
        res.status(413).json({
            error: {
                code: 'REQUEST_TOO_LARGE',
                message: 'Request entity too large'
            },
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
const sessionSecurity = (req, res, next) => {
    if (req.user) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const userAgent = req.get('User-Agent');
        const storedUserAgent = req.session?.userAgent;
        if (storedUserAgent && userAgent !== storedUserAgent) {
            console.warn('Potential session hijacking detected:', {
                userId: req.user.id,
                currentUserAgent: userAgent,
                storedUserAgent,
                ip: req.ip,
                timestamp: new Date().toISOString()
            });
        }
        if (req.session) {
            req.session.userAgent = userAgent;
        }
    }
    next();
};
exports.sessionSecurity = sessionSecurity;
const validateApiKey = (req, res, next) => {
    const apiKey = req.get('X-API-Key');
    if (!apiKey) {
        return next();
    }
    const apiKeyPattern = /^[a-zA-Z0-9]{32,64}$/;
    if (!apiKeyPattern.test(apiKey)) {
        res.status(400).json({
            error: {
                code: 'INVALID_API_KEY_FORMAT',
                message: 'Invalid API key format'
            },
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }
    console.log('API key used:', {
        keyPrefix: apiKey.substring(0, 8) + '...',
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    next();
};
exports.validateApiKey = validateApiKey;
//# sourceMappingURL=security.js.map