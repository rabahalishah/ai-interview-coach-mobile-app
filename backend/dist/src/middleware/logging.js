"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.requestTimeout = exports.apiVersioning = exports.sanitizeRequest = exports.securityHeaders = exports.performanceMonitor = exports.requestLogger = void 0;
const crypto_1 = __importDefault(require("crypto"));
function generateUUID() {
    return crypto_1.default.randomUUID();
}
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = generateUUID();
    res.setHeader('X-Request-ID', requestId);
    const context = {
        requestId,
        userId: req.user?.id,
        startTime,
        path: req.path,
        method: req.method
    };
    req.context = context;
    logRequest(req, context);
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding) {
        const duration = Date.now() - startTime;
        logResponse(req, res, context, duration);
        return originalEnd.call(this, chunk, encoding);
    };
    next();
};
exports.requestLogger = requestLogger;
function logRequest(req, context) {
    const logData = {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: context.userId,
        contentLength: req.get('Content-Length'),
        contentType: req.get('Content-Type')
    };
    console.log('Request:', JSON.stringify(logData));
}
function logResponse(req, res, context, duration) {
    const logData = {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: context.userId,
        contentLength: res.get('Content-Length')
    };
    if (res.statusCode >= 500) {
        console.error('Response:', JSON.stringify(logData));
    }
    else if (res.statusCode >= 400) {
        console.warn('Response:', JSON.stringify(logData));
    }
    else {
        console.log('Response:', JSON.stringify(logData));
    }
}
const performanceMonitor = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        if (duration > 1000) {
            console.warn('Slow Request:', {
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.path,
                duration: `${duration.toFixed(2)}ms`,
                statusCode: res.statusCode,
                userId: req.user?.id
            });
        }
        if (process.env.NODE_ENV === 'production') {
        }
    });
    next();
};
exports.performanceMonitor = performanceMonitor;
const securityHeaders = (req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "child-src 'none'",
        "worker-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "manifest-src 'self'"
    ].join('; '));
    next();
};
exports.securityHeaders = securityHeaders;
const sanitizeRequest = (req, res, next) => {
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        }
    }
    const ct = (req.get('Content-Type') || '').toLowerCase();
    if (!ct.includes('multipart/form-data') && req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
function sanitizeString(input) {
    if (typeof input !== 'string') {
        return input;
    }
    return input
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
}
function sanitizeObject(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    }
}
const apiVersioning = (req, res, next) => {
    const versionHeader = req.get('API-Version');
    const versionFromUrl = req.path.match(/^\/api\/v(\d+)/)?.[1];
    const version = versionHeader || versionFromUrl || '1';
    req.apiVersion = version;
    res.setHeader('API-Version', version);
    next();
};
exports.apiVersioning = apiVersioning;
const requestTimeout = (timeoutMs = 30000) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: {
                        code: 'REQUEST_TIMEOUT',
                        message: 'Request timeout'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            }
        }, timeoutMs);
        res.on('finish', () => {
            clearTimeout(timeout);
        });
        res.on('close', () => {
            clearTimeout(timeout);
        });
        next();
    };
};
exports.requestTimeout = requestTimeout;
const healthCheck = async (req, res, next) => {
    if (req.path === '/health' || req.path === '/api/health') {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || '1.0.0'
            };
            res.status(200).json(health);
            return;
        }
        catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
            return;
        }
    }
    next();
};
exports.healthCheck = healthCheck;
//# sourceMappingURL=logging.js.map