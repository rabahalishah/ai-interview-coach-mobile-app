"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskSensitiveData = exports.timeout = exports.delay = exports.parseFloatSafe = exports.parseIntSafe = exports.isValidNumber = exports.round = exports.clamp = exports.percentage = exports.flatten = exports.chunk = exports.uniqueBy = exports.unique = exports.groupBy = exports.shuffle = exports.randomElement = exports.randomInt = exports.truncate = exports.toKebabCase = exports.toSnakeCase = exports.toCamelCase = exports.capitalize = exports.formatDuration = exports.formatFileSize = exports.omit = exports.pick = exports.isEmpty = exports.deepClone = exports.throttle = exports.debounce = exports.retry = exports.sleep = exports.generateSecureToken = exports.generateId = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const generateId = () => {
    return (0, uuid_1.v4)();
};
exports.generateId = generateId;
const generateSecureToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateSecureToken = generateSecureToken;
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const retry = async (fn, maxRetries = 3, baseDelay = 1000, maxDelay = 10000) => {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxRetries) {
                break;
            }
            const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
            await (0, exports.sleep)(delay);
        }
    }
    throw lastError;
};
exports.retry = retry;
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
exports.debounce = debounce;
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};
exports.throttle = throttle;
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        return obj.map(item => (0, exports.deepClone)(item));
    }
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = (0, exports.deepClone)(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
};
exports.deepClone = deepClone;
const isEmpty = (obj) => {
    if (obj == null)
        return true;
    if (Array.isArray(obj) || typeof obj === 'string')
        return obj.length === 0;
    if (typeof obj === 'object')
        return Object.keys(obj).length === 0;
    return false;
};
exports.isEmpty = isEmpty;
const pick = (obj, keys) => {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};
exports.pick = pick;
const omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};
exports.omit = omit;
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m`;
    if (minutes > 0)
        return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};
exports.formatDuration = formatDuration;
const capitalize = (str) => {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
exports.capitalize = capitalize;
const toCamelCase = (str) => {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
        .replace(/\s+/g, '');
};
exports.toCamelCase = toCamelCase;
const toSnakeCase = (str) => {
    return str
        .replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('_');
};
exports.toSnakeCase = toSnakeCase;
const toKebabCase = (str) => {
    return str
        .replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('-');
};
exports.toKebabCase = toKebabCase;
const truncate = (str, length, suffix = '...') => {
    if (str.length <= length)
        return str;
    return str.substring(0, length - suffix.length) + suffix;
};
exports.truncate = truncate;
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
exports.randomInt = randomInt;
const randomElement = (array) => {
    return array[(0, exports.randomInt)(0, array.length - 1)];
};
exports.randomElement = randomElement;
const shuffle = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
exports.shuffle = shuffle;
const groupBy = (array, keyFn) => {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
};
exports.groupBy = groupBy;
const unique = (array) => {
    return [...new Set(array)];
};
exports.unique = unique;
const uniqueBy = (array, keyFn) => {
    const seen = new Set();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
exports.uniqueBy = uniqueBy;
const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};
exports.chunk = chunk;
const flatten = (array) => {
    return array.reduce((flat, item) => {
        return flat.concat(Array.isArray(item) ? (0, exports.flatten)(item) : item);
    }, []);
};
exports.flatten = flatten;
const percentage = (value, total) => {
    if (total === 0)
        return 0;
    return Math.round((value / total) * 100);
};
exports.percentage = percentage;
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
exports.clamp = clamp;
const round = (value, decimals = 2) => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
exports.round = round;
const isValidNumber = (value) => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};
exports.isValidNumber = isValidNumber;
const parseIntSafe = (value, fallback = 0) => {
    if (typeof value === 'number')
        return Math.floor(value);
    const parsed = parseInt(value, 10);
    return (0, exports.isValidNumber)(parsed) ? parsed : fallback;
};
exports.parseIntSafe = parseIntSafe;
const parseFloatSafe = (value, fallback = 0) => {
    if (typeof value === 'number')
        return value;
    const parsed = parseFloat(value);
    return (0, exports.isValidNumber)(parsed) ? parsed : fallback;
};
exports.parseFloatSafe = parseFloatSafe;
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.delay = delay;
const timeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
    ]);
};
exports.timeout = timeout;
const maskSensitiveData = (data) => {
    if (typeof data !== 'object' || data === null) {
        return data;
    }
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
    const masked = { ...data };
    for (const key in masked) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            masked[key] = '***MASKED***';
        }
        else if (typeof masked[key] === 'object') {
            masked[key] = (0, exports.maskSensitiveData)(masked[key]);
        }
    }
    return masked;
};
exports.maskSensitiveData = maskSensitiveData;
//# sourceMappingURL=helpers.js.map