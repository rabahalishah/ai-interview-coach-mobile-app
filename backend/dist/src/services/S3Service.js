"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createS3Service = exports.S3Service = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const auth_1 = require("../types/auth");
const constants_1 = require("../utils/constants");
const ErrorHandlingService_1 = require("./ErrorHandlingService");
const fileUpload_1 = require("../utils/fileUpload");
const MonitoringService_1 = require("./MonitoringService");
class S3Service {
    constructor(config) {
        aws_sdk_1.default.config.update({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region
        });
        this.s3 = new aws_sdk_1.default.S3({
            apiVersion: '2006-03-01',
            signatureVersion: 'v4'
        });
        this.bucketName = config.bucketName;
    }
    async upload(key, buffer, options = {}) {
        if (!key || key.trim().length === 0) {
            throw new auth_1.ValidationError('Key is required for upload');
        }
        if (!buffer) {
            throw new auth_1.ValidationError('Buffer is required for upload');
        }
        if (buffer.length === 0) {
            throw new auth_1.ValidationError('Buffer cannot be empty');
        }
        const requestId = `s3_upload_${key}_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting S3 upload operation', {
            operationType: 's3_upload',
            timestamp: new Date().toISOString(),
            requestId,
            key,
            bufferSize: buffer.length,
            contentType: options.contentType || 'application/octet-stream'
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeS3Operation(async () => {
                const uploadParams = {
                    Bucket: this.bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: options.contentType || 'application/octet-stream',
                    ServerSideEncryption: 'AES256',
                    Metadata: options.metadata || {}
                };
                const uploadResult = await this.s3.upload(uploadParams).promise();
                return uploadResult.Location;
            }, requestId, async () => {
                try {
                    await this.s3.deleteObject({
                        Bucket: this.bucketName,
                        Key: key
                    }).promise();
                }
                catch (cleanupError) {
                    console.warn(`Failed to cleanup partial upload for key: ${key}`, cleanupError);
                }
            });
            const responseTime = Date.now() - startTime;
            console.log('S3 upload operation succeeded', {
                operationType: 's3_upload',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    key,
                    location: result,
                    bufferSize: buffer.length,
                    contentType: options.contentType || 'application/octet-stream'
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', true, responseTime);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('S3 upload operation failed', {
                operationType: 's3_upload',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || error.statusCode || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    key,
                    bufferSize: buffer.length,
                    contentType: options.contentType,
                    errorType: error.name
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', false, responseTime, error.code || error.statusCode?.toString() || error.name || 'UNKNOWN_ERROR');
            throw error;
        }
    }
    async download(key) {
        if (!key) {
            throw new auth_1.ValidationError('Key is required for download');
        }
        const requestId = `s3_download_${key}_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting S3 download operation', {
            operationType: 's3_download',
            timestamp: new Date().toISOString(),
            requestId,
            key
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeS3Operation(async () => {
                const downloadParams = {
                    Bucket: this.bucketName,
                    Key: key
                };
                const downloadResult = await this.s3.getObject(downloadParams).promise();
                if (!downloadResult.Body) {
                    throw new auth_1.ExternalServiceError('File not found or empty', { key });
                }
                return downloadResult.Body;
            }, requestId);
            const responseTime = Date.now() - startTime;
            console.log('S3 download operation succeeded', {
                operationType: 's3_download',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    key,
                    bufferSize: result.length
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', true, responseTime);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('S3 download operation failed', {
                operationType: 's3_download',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || error.statusCode || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    key,
                    errorType: error.name
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', false, responseTime, error.code || error.statusCode?.toString() || error.name || 'UNKNOWN_ERROR');
            throw error;
        }
    }
    async getSignedUrl(key, expiresIn = 3600) {
        if (!key) {
            throw new auth_1.ValidationError('Key is required for signed URL generation');
        }
        if (expiresIn < 1 || expiresIn > 86400) {
            throw new auth_1.ValidationError('Expires in must be between 1 and 86400 seconds');
        }
        const requestId = `s3_signed_url_${key}_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting S3 signed URL generation', {
            operationType: 's3_get_signed_url',
            timestamp: new Date().toISOString(),
            requestId,
            key,
            expiresIn
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeS3Operation(async () => {
                const params = {
                    Bucket: this.bucketName,
                    Key: key,
                    Expires: expiresIn
                };
                return this.s3.getSignedUrl('getObject', params);
            }, requestId);
            const responseTime = Date.now() - startTime;
            console.log('S3 signed URL generation succeeded', {
                operationType: 's3_get_signed_url',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    key,
                    expiresIn,
                    urlLength: result.length
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', true, responseTime);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('S3 signed URL generation failed', {
                operationType: 's3_get_signed_url',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || error.statusCode || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    key,
                    expiresIn,
                    errorType: error.name
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', false, responseTime, error.code || error.statusCode?.toString() || error.name || 'UNKNOWN_ERROR');
            throw error;
        }
    }
    async generateUploadUrl(key, options) {
        if (!key) {
            throw new auth_1.ValidationError('Key is required for upload URL generation');
        }
        if (!options.contentType) {
            throw new auth_1.ValidationError('Content type is required for upload URL generation');
        }
        const expiresIn = options.expiresIn !== undefined ? options.expiresIn : 3600;
        if (expiresIn < 1 || expiresIn > 86400) {
            throw new auth_1.ValidationError('Expires in must be between 1 and 86400 seconds');
        }
        const requestId = `s3_upload_url_${key}_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting S3 upload URL generation', {
            operationType: 's3_generate_upload_url',
            timestamp: new Date().toISOString(),
            requestId,
            key,
            contentType: options.contentType,
            expiresIn
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeS3Operation(async () => {
                const params = {
                    Bucket: this.bucketName,
                    Key: key,
                    ContentType: options.contentType,
                    Expires: expiresIn
                };
                const url = this.s3.getSignedUrl('putObject', params);
                return {
                    url,
                    key,
                    fields: {
                        'Content-Type': options.contentType
                    }
                };
            }, requestId);
            const responseTime = Date.now() - startTime;
            console.log('S3 upload URL generation succeeded', {
                operationType: 's3_generate_upload_url',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    key,
                    contentType: options.contentType,
                    expiresIn,
                    urlLength: result.url.length
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', true, responseTime);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('S3 upload URL generation failed', {
                operationType: 's3_generate_upload_url',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || error.statusCode || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    key,
                    contentType: options.contentType,
                    expiresIn,
                    errorType: error.name
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('s3', false, responseTime, error.code || error.statusCode?.toString() || error.name || 'UNKNOWN_ERROR');
            throw error;
        }
    }
    async verifyUpload(key) {
        return await this.fileExists(key);
    }
    async deleteFile(key) {
        if (!key) {
            throw new auth_1.ValidationError('Key is required for file deletion');
        }
        const requestId = `s3_delete_${key}_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting S3 delete operation', {
            operationType: 's3_delete',
            timestamp: new Date().toISOString(),
            requestId,
            key
        });
        try {
            await ErrorHandlingService_1.errorHandlingService.executeS3Operation(async () => {
                const deleteParams = {
                    Bucket: this.bucketName,
                    Key: key
                };
                await this.s3.deleteObject(deleteParams).promise();
            }, requestId);
            const responseTime = Date.now() - startTime;
            console.log('S3 delete operation succeeded', {
                operationType: 's3_delete',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    key
                }
            });
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('S3 delete operation failed', {
                operationType: 's3_delete',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || error.statusCode || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    key,
                    errorType: error.name
                }
            });
            throw error;
        }
    }
    async fileExists(key) {
        if (!key) {
            throw new auth_1.ValidationError('Key is required for file existence check');
        }
        const requestId = `s3_exists_${key}_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting S3 file existence check', {
            operationType: 's3_file_exists',
            timestamp: new Date().toISOString(),
            requestId,
            key
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeS3Operation(async () => {
                const headParams = {
                    Bucket: this.bucketName,
                    Key: key
                };
                await this.s3.headObject(headParams).promise();
                return true;
            }, requestId);
            const responseTime = Date.now() - startTime;
            console.log('S3 file existence check succeeded', {
                operationType: 's3_file_exists',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    key,
                    exists: result
                }
            });
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            if (error.code === 'NotFound' || error.statusCode === 404) {
                console.log('S3 file existence check completed - file not found', {
                    operationType: 's3_file_exists',
                    requestId,
                    responseTimeMs: responseTime,
                    metadata: {
                        key,
                        exists: false
                    }
                });
                return false;
            }
            console.error('S3 file existence check failed', {
                operationType: 's3_file_exists',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || error.statusCode || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    key,
                    errorType: error.name
                }
            });
            throw error;
        }
    }
    validateFile(buffer, filename, options = {}) {
        const { allowedTypes = constants_1.S3_CONFIG.ALLOWED_FILE_TYPES, maxSizeBytes = constants_1.S3_CONFIG.MAX_FILE_SIZE } = options;
        if (!buffer || buffer.length === 0) {
            throw new auth_1.ValidationError('File cannot be empty');
        }
        if (!filename || filename.trim().length === 0) {
            throw new auth_1.ValidationError('Filename is required');
        }
        if (buffer.length > maxSizeBytes) {
            throw new auth_1.ValidationError(`File size (${buffer.length} bytes) exceeds maximum allowed size of ${maxSizeBytes} bytes (${Math.round(maxSizeBytes / 1024 / 1024)}MB)`);
        }
        const parts = filename.toLowerCase().split('.');
        if (parts.length < 2) {
            throw new auth_1.ValidationError('File must have a valid extension');
        }
        const fileExtension = parts.pop();
        if (!fileExtension) {
            throw new auth_1.ValidationError('File must have a valid extension');
        }
        const extensionWithDot = `.${fileExtension}`;
        if (!allowedTypes.includes(extensionWithDot)) {
            throw new auth_1.ValidationError(`File type '${extensionWithDot}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }
        if (buffer.length < 100) {
            throw new auth_1.ValidationError('File is too small to be valid (minimum 100 bytes required)');
        }
    }
    generateFileKey(prefix, userId, filename) {
        const timestamp = Date.now();
        const sanitizedFilename = (0, fileUpload_1.sanitizeFilename)(filename);
        return `${prefix}${userId}/${timestamp}_${sanitizedFilename}`;
    }
    async healthCheck() {
        const requestId = `s3_health_check_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting S3 health check', {
            operationType: 's3_health_check',
            timestamp: new Date().toISOString(),
            requestId
        });
        try {
            await this.s3.listObjectsV2({
                Bucket: this.bucketName,
                MaxKeys: 1
            }).promise();
            const responseTime = Date.now() - startTime;
            console.log('S3 health check succeeded', {
                operationType: 's3_health_check',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    status: 'healthy'
                }
            });
            return true;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('S3 health check failed', {
                operationType: 's3_health_check',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || error.statusCode || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    errorType: error.name
                }
            });
            return false;
        }
    }
}
exports.S3Service = S3Service;
const createS3Service = (config) => {
    return new S3Service(config);
};
exports.createS3Service = createS3Service;
//# sourceMappingURL=S3Service.js.map