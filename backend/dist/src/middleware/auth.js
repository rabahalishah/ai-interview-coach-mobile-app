"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationError = exports.AuthenticationError = exports.SubscriptionTier = exports.validateAccountStatus = exports.handleTokenRefresh = exports.authRateLimit = exports.requireAdmin = exports.requireOwnership = exports.requireSubscription = exports.optionalAuthenticate = exports.requireEmailVerified = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = __importDefault(require("../lib/prisma"));
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["PAID"] = "paid";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
class AuthenticationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
const authenticate = async (req, res, next) => {
    try {
        const token = jwt_1.jwtUtils.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            throw new AuthenticationError('No token provided');
        }
        const payload = jwt_1.jwtUtils.validateToken(token);
        const user = await prisma_1.default.user.findUnique({
            where: { id: payload.userId }
        });
        if (!user) {
            throw new AuthenticationError('User not found');
        }
        const appUser = {
            id: user.id,
            email: user.email,
            passwordHash: user.passwordHash,
            subscriptionTier: user.subscriptionTier,
            emailVerified: user.emailVerified,
            pendingEmail: user.pendingEmail ?? null,
            onboardingCompletedAt: user.onboardingCompletedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        req.user = appUser;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const requireEmailVerified = (req, res, next) => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }
        if (!req.user.emailVerified) {
            res.status(403).json({
                error: {
                    code: 'EMAIL_NOT_VERIFIED',
                    message: 'Please verify your email to access this resource.',
                    details: { email: req.user.email }
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireEmailVerified = requireEmailVerified;
const optionalAuthenticate = async (req, res, next) => {
    try {
        const token = jwt_1.jwtUtils.extractTokenFromHeader(req.headers.authorization);
        if (token) {
            const payload = jwt_1.jwtUtils.validateToken(token);
            const user = await prisma_1.default.user.findUnique({
                where: { id: payload.userId }
            });
            if (user) {
                const appUser = {
                    id: user.id,
                    email: user.email,
                    passwordHash: user.passwordHash,
                    subscriptionTier: user.subscriptionTier,
                    emailVerified: user.emailVerified,
                    pendingEmail: user.pendingEmail ?? null,
                    onboardingCompletedAt: user.onboardingCompletedAt,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                };
                req.user = appUser;
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
const requireSubscription = (requiredTier) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new AuthenticationError('Authentication required');
            }
            const tierHierarchy = {
                [SubscriptionTier.FREE]: 0,
                [SubscriptionTier.PAID]: 1
            };
            const userTierLevel = tierHierarchy[req.user.subscriptionTier];
            const requiredTierLevel = tierHierarchy[requiredTier];
            if (userTierLevel < requiredTierLevel) {
                throw new AuthorizationError(`${requiredTier} subscription required`, {
                    currentTier: req.user.subscriptionTier,
                    requiredTier
                });
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireSubscription = requireSubscription;
const requireOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new AuthenticationError('Authentication required');
            }
            const resourceId = req.params.id || req.params.sessionId;
            if (!resourceId) {
                throw new AuthorizationError('Resource ID required');
            }
            let resource = null;
            switch (resourceType) {
                case 'session':
                    resource = await prisma_1.default.audioSession.findUnique({
                        where: { id: resourceId },
                        select: { userId: true }
                    });
                    break;
                case 'profile':
                    resource = await prisma_1.default.userProfile.findUnique({
                        where: { userId: resourceId },
                        select: { userId: true }
                    });
                    break;
                default:
                    throw new Error(`Unknown resource type: ${resourceType}`);
            }
            if (!resource) {
                throw new AuthorizationError('Resource not found');
            }
            if (resource.userId !== req.user.id) {
                throw new AuthorizationError('Access denied - resource not owned by user');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireOwnership = requireOwnership;
const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
        const isAdmin = adminEmails.includes(req.user.email);
        if (!isAdmin) {
            throw new AuthorizationError('Admin privileges required');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireAdmin = requireAdmin;
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();
    return (req, res, next) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        const keysToDelete = [];
        attempts.forEach((value, key) => {
            if (now > value.resetTime) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => attempts.delete(key));
        const clientAttempts = attempts.get(clientId);
        if (!clientAttempts) {
            attempts.set(clientId, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        if (now > clientAttempts.resetTime) {
            attempts.set(clientId, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        if (clientAttempts.count >= maxAttempts) {
            const remainingTime = Math.ceil((clientAttempts.resetTime - now) / 1000);
            res.status(429).json({
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Too many authentication attempts. Try again in ${remainingTime} seconds.`
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
            return;
        }
        clientAttempts.count++;
        next();
    };
};
exports.authRateLimit = authRateLimit;
const handleTokenRefresh = async (req, res, next) => {
    try {
        const token = jwt_1.jwtUtils.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            next();
            return;
        }
        const expiration = jwt_1.jwtUtils.getTokenExpiration(token);
        if (expiration) {
            const oneHour = 60 * 60 * 1000;
            const timeUntilExpiry = expiration.getTime() - Date.now();
            if (timeUntilExpiry < oneHour && timeUntilExpiry > 0) {
                try {
                    const newToken = jwt_1.jwtUtils.refreshToken(token);
                    res.setHeader('X-New-Token', newToken);
                }
                catch (error) {
                    console.warn('Token refresh failed:', error.message);
                }
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.handleTokenRefresh = handleTokenRefresh;
const validateAccountStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) {
            throw new AuthenticationError('User account not found');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateAccountStatus = validateAccountStatus;
//# sourceMappingURL=auth.js.map