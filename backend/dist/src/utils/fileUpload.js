"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContentTypeFromExtension = exports.sanitizeFilename = exports.extractFileMetadata = exports.validateFileBuffer = exports.onboardingVoiceUpload = exports.audioUpload = exports.resumeUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../types/auth");
const constants_1 = require("./constants");
const storage = multer_1.default.memoryStorage();
const resumeFileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new auth_1.ValidationError('Only PDF and Word documents are allowed for resume uploads'));
    }
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    if (!fileExtension || !constants_1.S3_CONFIG.ALLOWED_FILE_TYPES.includes(`.${fileExtension}`)) {
        return cb(new auth_1.ValidationError(`File type not allowed. Allowed types: ${constants_1.S3_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`));
    }
    cb(null, true);
};
const audioFileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/ogg',
        'audio/webm'
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new auth_1.ValidationError('Only audio files are allowed'));
    }
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    if (!fileExtension || !constants_1.S3_CONFIG.ALLOWED_AUDIO_TYPES.includes(`.${fileExtension}`)) {
        return cb(new auth_1.ValidationError(`Audio type not allowed. Allowed types: ${constants_1.S3_CONFIG.ALLOWED_AUDIO_TYPES.join(', ')}`));
    }
    cb(null, true);
};
exports.resumeUpload = (0, multer_1.default)({
    storage,
    fileFilter: resumeFileFilter,
    limits: {
        fileSize: constants_1.S3_CONFIG.MAX_FILE_SIZE,
        files: 1
    }
});
exports.audioUpload = (0, multer_1.default)({
    storage,
    fileFilter: audioFileFilter,
    limits: {
        fileSize: constants_1.FILE_SIZE_LIMITS.AUDIO,
        files: 1
    }
});
exports.onboardingVoiceUpload = (0, multer_1.default)({
    storage,
    fileFilter: audioFileFilter,
    limits: {
        fileSize: constants_1.FILE_SIZE_LIMITS.AUDIO,
        files: 1
    }
}).any();
const validateFileBuffer = (buffer, filename, options = {}) => {
    const { allowedTypes = constants_1.S3_CONFIG.ALLOWED_FILE_TYPES, maxSizeBytes = constants_1.S3_CONFIG.MAX_FILE_SIZE, minSizeBytes = 1 } = options;
    if (buffer.length > maxSizeBytes) {
        throw new auth_1.ValidationError(`File size ${buffer.length} bytes exceeds maximum allowed size of ${maxSizeBytes} bytes`);
    }
    if (buffer.length < minSizeBytes) {
        throw new auth_1.ValidationError(`File size ${buffer.length} bytes is below minimum required size of ${minSizeBytes} bytes`);
    }
    const fileExtension = filename.toLowerCase().split('.').pop();
    if (!fileExtension) {
        throw new auth_1.ValidationError('File must have a valid extension');
    }
    const fullExtension = `.${fileExtension}`;
    if (!allowedTypes.includes(fullExtension)) {
        throw new auth_1.ValidationError(`File type '${fullExtension}' not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    if (buffer.length === 0) {
        throw new auth_1.ValidationError('File cannot be empty');
    }
};
exports.validateFileBuffer = validateFileBuffer;
const extractFileMetadata = (file) => {
    const extension = file.originalname.toLowerCase().split('.').pop() || '';
    return {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        extension
    };
};
exports.extractFileMetadata = extractFileMetadata;
const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};
exports.sanitizeFilename = sanitizeFilename;
const getContentTypeFromExtension = (extension) => {
    const contentTypeMap = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg'
    };
    return contentTypeMap[extension.toLowerCase()] || 'application/octet-stream';
};
exports.getContentTypeFromExtension = getContentTypeFromExtension;
//# sourceMappingURL=fileUpload.js.map