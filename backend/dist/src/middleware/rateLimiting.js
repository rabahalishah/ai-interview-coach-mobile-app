"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipFilter = exports.abuseDetection = exports.RedisRateLimit = exports.progressiveRateLimit = exports.aiProcessingRateLimit = exports.uploadRateLimit = exports.apiRateLimit = exports.passwordResetRateLimit = exports.authRateLimit = exports.createRateLimit = void 0;
const config_1 = require("../utils/config");
class MemoryStore {
    constructor() {
        this.store = new Map();
    }
    get(key) {
        return this.store.get(key);
    }
    set(key, data) {
        this.store.set(key, data);
    }
    delete(key) {
        this.store.delete(key);
    }
    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.store.entries()) {
            if (now > data.resetTime) {
                this.store.delete(key);
            }
        }
    }
}
const store = new MemoryStore();
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
    setInterval(() => {
        store.cleanup();
    }, 5 * 60 * 1000).unref();
}
const createRateLimit = (config) => {
    return (req, res, next) => {
        if (process.env.JEST_WORKER_ID !== undefined) {
            next();
            return;
        }
        const clientId = getClientIdentifier(req);
        const now = Date.now();
        let clientData = store.get(clientId);
        if (!clientData || now > clientData.resetTime) {
            clientData = {
                count: 1,
                resetTime: now + config.windowMs,
                firstRequest: now
            };
            store.set(clientId, clientData);
            next();
            return;
        }
        if (clientData.count >= config.maxRequests) {
            const remainingTime = Math.ceil((clientData.resetTime - now) / 1000);
            res.status(429).json({
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: config.message || `Too many requests. Try again in ${remainingTime} seconds.`,
                    details: {
                        limit: config.maxRequests,
                        windowMs: config.windowMs,
                        retryAfter: remainingTime
                    }
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        clientData.count++;
        store.set(clientId, clientData);
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - clientData.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));
        next();
    };
};
exports.createRateLimit = createRateLimit;
function getClientIdentifier(req) {
    const userId = req.user?.id;
    if (userId) {
        return `user:${userId}`;
    }
    const forwarded = req.get('X-Forwarded-For');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return `ip:${ip}`;
}
exports.authRateLimit = (0, exports.createRateLimit)({
    windowMs: config_1.config.AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: config_1.config.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    message: 'Too many authentication attempts. Please try again later.'
});
exports.passwordResetRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    message: 'Too many password reset attempts. Please try again later.'
});
exports.apiRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Too many API requests. Please slow down.'
});
exports.uploadRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many file uploads. Please try again later.'
});
exports.aiProcessingRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    message: 'Too many AI processing requests. Please try again later.'
});
const progressiveRateLimit = (baseConfig) => {
    const violationStore = new Map();
    return (req, res, next) => {
        if (process.env.JEST_WORKER_ID !== undefined) {
            next();
            return;
        }
        const clientId = getClientIdentifier(req);
        const now = Date.now();
        const violations = violationStore.get(clientId);
        let multiplier = 1;
        if (violations) {
            if (now - violations.lastViolation > 24 * 60 * 60 * 1000) {
                violationStore.delete(clientId);
            }
            else {
                multiplier = Math.min(violations.count, 10);
            }
        }
        const adjustedConfig = {
            ...baseConfig,
            maxRequests: Math.max(1, Math.floor(baseConfig.maxRequests / multiplier)),
            windowMs: baseConfig.windowMs * multiplier
        };
        const rateLimiter = (0, exports.createRateLimit)(adjustedConfig);
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (res.statusCode === 429) {
                const currentViolations = violationStore.get(clientId) || { count: 0, lastViolation: 0 };
                violationStore.set(clientId, {
                    count: currentViolations.count + 1,
                    lastViolation: now
                });
            }
            return originalJson(body);
        };
        rateLimiter(req, res, next);
    };
};
exports.progressiveRateLimit = progressiveRateLimit;
class RedisRateLimit {
    constructor(redisClient) {
        this.redisClient = redisClient;
    }
    createRateLimit(config) {
        return async (req, res, next) => {
            const clientId = getClientIdentifier(req);
            const key = `rate_limit:${clientId}`;
            const now = Date.now();
            try {
                const pipeline = this.redisClient.pipeline();
                pipeline.incr(key);
                pipeline.expire(key, Math.ceil(config.windowMs / 1000));
                const results = await pipeline.exec();
                const count = results[0][1];
                if (count > config.maxRequests) {
                    const ttl = await this.redisClient.ttl(key);
                    res.status(429).json({
                        error: {
                            code: 'RATE_LIMIT_EXCEEDED',
                            message: config.message || `Too many requests. Try again in ${ttl} seconds.`,
                            details: {
                                limit: config.maxRequests,
                                windowMs: config.windowMs,
                                retryAfter: ttl
                            }
                        },
                        timestamp: new Date().toISOString(),
                        path: req.path
                    });
                    return;
                }
                res.setHeader('X-RateLimit-Limit', config.maxRequests);
                res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count));
                res.setHeader('X-RateLimit-Reset', Math.ceil((now + config.windowMs) / 1000));
                next();
            }
            catch (error) {
                console.error('Rate limiting error:', error);
                next();
            }
        };
    }
}
exports.RedisRateLimit = RedisRateLimit;
const PASSWORD_KEYS = new Set(['password', 'newPassword', 'currentPassword']);
function collectInspectableStrings(query, body) {
    const out = [];
    function walk(value) {
        if (value === null || value === undefined)
            return;
        if (typeof value === 'string') {
            out.push(value);
            return;
        }
        if (typeof value !== 'object')
            return;
        if (Array.isArray(value)) {
            for (const item of value)
                walk(item);
            return;
        }
        for (const key of Object.keys(value)) {
            if (PASSWORD_KEYS.has(key))
                continue;
            walk(value[key]);
        }
    }
    if (query && typeof query === 'object') {
        for (const key of Object.keys(query)) {
            if (PASSWORD_KEYS.has(key))
                continue;
            const v = query[key];
            if (typeof v === 'string')
                out.push(v);
            else if (Array.isArray(v)) {
                for (const item of v) {
                    if (typeof item === 'string')
                        out.push(item);
                }
            }
        }
    }
    walk(body);
    return out;
}
const abuseDetection = (req, res, next) => {
    const clientId = getClientIdentifier(req);
    const strings = collectInspectableStrings(req.query, req.body);
    const requestData = strings.join('\u0000');
    const suspiciousPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
        /<script[^>]*>.*?<\/script>/gi,
        /\.\.[\/\\]/,
        /;\s*(curl|wget|rm\b|bash|\/bin\/|sh\b|exec\b|eval\b)/i,
        /\$\(/,
        /`/,
        /\|\s*(curl|wget|bash|sh)\b/i,
        /(&&|\|\|)\s*(curl|wget|rm|bash|sh)\b/i
    ];
    for (const pattern of suspiciousPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(requestData)) {
            console.warn('Suspicious request detected:', {
                clientId,
                pattern: pattern.source,
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });
            res.status(400).json({
                error: {
                    code: 'SUSPICIOUS_REQUEST',
                    message: 'Request contains potentially malicious content'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
    }
    next();
};
exports.abuseDetection = abuseDetection;
const ipFilter = (options) => {
    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        if (options.blacklist && options.blacklist.includes(clientIp)) {
            res.status(403).json({
                error: {
                    code: 'IP_BLOCKED',
                    message: 'Access denied from this IP address'
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        if (options.whitelist && options.whitelist.length > 0) {
            if (!options.whitelist.includes(clientIp)) {
                res.status(403).json({
                    error: {
                        code: 'IP_NOT_WHITELISTED',
                        message: 'Access denied - IP not in whitelist'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
                return;
            }
        }
        next();
    };
};
exports.ipFilter = ipFilter;
//# sourceMappingURL=rateLimiting.js.map