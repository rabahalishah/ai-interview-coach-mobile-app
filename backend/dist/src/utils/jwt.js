"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenExpiration = exports.refreshToken = exports.isTokenExpired = exports.extractTokenFromHeader = exports.decodeToken = exports.validateResetToken = exports.generateResetToken = exports.validateToken = exports.generateToken = exports.jwtUtils = void 0;
const jwt = __importStar(require("jsonwebtoken"));
class AuthenticationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'AuthenticationError';
    }
}
class JWTUtils {
    constructor() {
        this.config = {
            secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: process.env.JWT_ISSUER || 'ai-audio-summarization'
        };
        if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET environment variable is required in production');
        }
    }
    generateToken(payload) {
        try {
            const body = {
                ...payload,
                emailVerified: payload.emailVerified
            };
            return jwt.sign(body, this.config.secret, {
                expiresIn: this.config.expiresIn,
                issuer: this.config.issuer,
                algorithm: 'HS256'
            });
        }
        catch (error) {
            throw new AuthenticationError('Failed to generate token', { error: error.message });
        }
    }
    validateToken(token) {
        try {
            const decoded = jwt.verify(token, this.config.secret, {
                issuer: this.config.issuer,
                algorithms: ['HS256']
            });
            if (typeof decoded.emailVerified !== 'boolean') {
                decoded.emailVerified = true;
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AuthenticationError('Token has expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new AuthenticationError('Invalid token');
            }
            else {
                throw new AuthenticationError('Token validation failed', { error: error.message });
            }
        }
    }
    decodeToken(token) {
        try {
            return jwt.decode(token);
        }
        catch (error) {
            return null;
        }
    }
    extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
    isTokenExpired(token) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded || !decoded.exp) {
                return true;
            }
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        }
        catch (error) {
            return true;
        }
    }
    refreshToken(token) {
        const payload = this.validateToken(token);
        const { iat, exp, ...userPayload } = payload;
        return this.generateToken(userPayload);
    }
    getTokenExpiration(token) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded || !decoded.exp) {
                return null;
            }
            return new Date(decoded.exp * 1000);
        }
        catch (error) {
            return null;
        }
    }
    generateResetToken(email) {
        try {
            const payload = {
                email: email.toLowerCase(),
                purpose: 'password_reset'
            };
            return jwt.sign(payload, this.config.secret, {
                expiresIn: '15m',
                issuer: this.config.issuer,
                algorithm: 'HS256'
            });
        }
        catch (error) {
            throw new AuthenticationError('Failed to generate reset token', { error: error.message });
        }
    }
    validateResetToken(token) {
        try {
            const decoded = jwt.verify(token, this.config.secret, {
                issuer: this.config.issuer,
                algorithms: ['HS256']
            });
            if (decoded.purpose !== 'password_reset') {
                throw new AuthenticationError('Invalid reset token');
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AuthenticationError('Reset token has expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new AuthenticationError('Invalid reset token');
            }
            else if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError('Reset token validation failed', { error: error.message });
        }
    }
}
exports.jwtUtils = new JWTUtils();
exports.generateToken = exports.jwtUtils.generateToken.bind(exports.jwtUtils);
exports.validateToken = exports.jwtUtils.validateToken.bind(exports.jwtUtils);
exports.generateResetToken = exports.jwtUtils.generateResetToken.bind(exports.jwtUtils);
exports.validateResetToken = exports.jwtUtils.validateResetToken.bind(exports.jwtUtils);
exports.decodeToken = exports.jwtUtils.decodeToken.bind(exports.jwtUtils);
exports.extractTokenFromHeader = exports.jwtUtils.extractTokenFromHeader.bind(exports.jwtUtils);
exports.isTokenExpired = exports.jwtUtils.isTokenExpired.bind(exports.jwtUtils);
exports.refreshToken = exports.jwtUtils.refreshToken.bind(exports.jwtUtils);
exports.getTokenExpiration = exports.jwtUtils.getTokenExpiration.bind(exports.jwtUtils);
//# sourceMappingURL=jwt.js.map