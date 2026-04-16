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
exports.getPasswordStrengthDescription = exports.getPasswordStrength = exports.needsRehash = exports.generateSecurePassword = exports.validatePassword = exports.verifyPassword = exports.hashPassword = exports.passwordUtils = void 0;
const bcrypt = __importStar(require("bcrypt"));
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'ValidationError';
    }
}
class PasswordUtils {
    constructor() {
        this.config = {
            saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
            minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
            maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128'),
            requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
            requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
            requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
            requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false'
        };
        if (this.config.saltRounds < 10) {
            console.warn('Warning: Salt rounds below 10 may not be secure enough');
        }
    }
    async hashPassword(password) {
        try {
            this.validatePassword(password);
            const hash = await bcrypt.hash(password, this.config.saltRounds);
            return hash;
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error(`Failed to hash password: ${error.message}`);
        }
    }
    async verifyPassword(password, hash) {
        try {
            if (!password || !hash) {
                return false;
            }
            const isValid = await bcrypt.compare(password, hash);
            return isValid;
        }
        catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }
    validatePassword(password) {
        if (!password) {
            throw new ValidationError('Password is required');
        }
        if (typeof password !== 'string') {
            throw new ValidationError('Password must be a string');
        }
        if (password.length < this.config.minLength) {
            throw new ValidationError(`Password must be at least ${this.config.minLength} characters long`);
        }
        if (password.length > this.config.maxLength) {
            throw new ValidationError(`Password must not exceed ${this.config.maxLength} characters`);
        }
        const errors = [];
        if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('at least one uppercase letter');
        }
        if (this.config.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('at least one lowercase letter');
        }
        if (this.config.requireNumbers && !/\d/.test(password)) {
            errors.push('at least one number');
        }
        if (this.config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('at least one special character');
        }
        if (errors.length > 0) {
            throw new ValidationError(`Password must contain ${errors.join(', ')}`);
        }
    }
    generateSecurePassword(length = 16) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let charset = '';
        let password = '';
        if (this.config.requireUppercase) {
            charset += uppercase;
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
        }
        if (this.config.requireLowercase) {
            charset += lowercase;
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
        }
        if (this.config.requireNumbers) {
            charset += numbers;
            password += numbers[Math.floor(Math.random() * numbers.length)];
        }
        if (this.config.requireSpecialChars) {
            charset += specialChars;
            password += specialChars[Math.floor(Math.random() * specialChars.length)];
        }
        for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    needsRehash(hash) {
        try {
            const rounds = bcrypt.getRounds(hash);
            return rounds < this.config.saltRounds;
        }
        catch (error) {
            return true;
        }
    }
    getPasswordStrength(password) {
        if (!password)
            return 0;
        let score = 0;
        const length = password.length;
        if (length >= 8)
            score += 25;
        if (length >= 12)
            score += 10;
        if (length >= 16)
            score += 10;
        if (/[a-z]/.test(password))
            score += 10;
        if (/[A-Z]/.test(password))
            score += 10;
        if (/\d/.test(password))
            score += 10;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
            score += 15;
        if (/(.)\1{2,}/.test(password))
            score -= 10;
        if (/123|abc|qwe/i.test(password))
            score -= 10;
        return Math.max(0, Math.min(100, score));
    }
    getPasswordStrengthDescription(password) {
        const score = this.getPasswordStrength(password);
        if (score < 30)
            return 'Very Weak';
        if (score < 50)
            return 'Weak';
        if (score < 70)
            return 'Fair';
        if (score < 90)
            return 'Strong';
        return 'Very Strong';
    }
}
exports.passwordUtils = new PasswordUtils();
exports.hashPassword = exports.passwordUtils.hashPassword.bind(exports.passwordUtils);
exports.verifyPassword = exports.passwordUtils.verifyPassword.bind(exports.passwordUtils);
exports.validatePassword = exports.passwordUtils.validatePassword.bind(exports.passwordUtils);
exports.generateSecurePassword = exports.passwordUtils.generateSecurePassword.bind(exports.passwordUtils);
exports.needsRehash = exports.passwordUtils.needsRehash.bind(exports.passwordUtils);
exports.getPasswordStrength = exports.passwordUtils.getPasswordStrength.bind(exports.passwordUtils);
exports.getPasswordStrengthDescription = exports.passwordUtils.getPasswordStrengthDescription.bind(exports.passwordUtils);
//# sourceMappingURL=password.js.map