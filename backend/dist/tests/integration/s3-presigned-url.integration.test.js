"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../../src/services/MonitoringService', () => {
    const mockMonitoringService = {
        recordAPICall: jest.fn(),
        recordError: jest.fn(),
        recordAPIOperation: jest.fn(),
        getMetrics: jest.fn().mockReturnValue({}),
        getHealthStatus: jest.fn().mockReturnValue({ status: 'healthy' }),
        collectSystemMetrics: jest.fn(),
        performHealthChecks: jest.fn(),
        cleanupOldMetrics: jest.fn(),
        cleanupOldAlerts: jest.fn(),
        addAlert: jest.fn(),
        checkForAlerts: jest.fn()
    };
    return {
        monitoringService: mockMonitoringService,
        MonitoringService: jest.fn().mockImplementation(() => mockMonitoringService)
    };
});
const S3Service_1 = require("../../src/services/S3Service");
const auth_1 = require("../../src/types/auth");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new url_1.URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https_1.default : http_1.default;
        protocol.get(url, (res) => {
            const chunks = [];
            res.on('data', (chunk) => {
                chunks.push(Buffer.from(chunk));
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode || 0,
                    data: Buffer.concat(chunks)
                });
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}
function httpPut(url, data, headers) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new url_1.URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https_1.default : http_1.default;
        const options = {
            method: 'PUT',
            headers: {
                'Content-Length': data.length,
                ...headers
            }
        };
        const req = protocol.request(url, options, (res) => {
            res.on('data', () => { });
            res.on('end', () => {
                resolve({ status: res.statusCode || 0 });
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        req.write(data);
        req.end();
    });
}
describe('S3 Pre-signed URL Integration Tests', () => {
    let s3Service;
    let testFileKey;
    let testFileBuffer;
    beforeAll(async () => {
        const s3Config = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret',
            region: process.env.AWS_REGION || 'us-east-1',
            bucketName: process.env.AWS_S3_BUCKET || 'test-bucket'
        };
        s3Service = new S3Service_1.S3Service(s3Config);
        testFileBuffer = Buffer.from('This is a test file for pre-signed URL testing. It contains some sample content to verify upload and download functionality.');
        testFileKey = `test-presigned-urls/test-file-${Date.now()}.txt`;
        await s3Service.upload(testFileKey, testFileBuffer, {
            contentType: 'text/plain'
        });
    });
    afterAll(async () => {
        try {
            await s3Service.deleteFile(testFileKey);
            const uploadTestKey = testFileKey.replace('test-file', 'upload-test');
            try {
                await s3Service.deleteFile(uploadTestKey);
            }
            catch (error) {
            }
        }
        catch (error) {
            console.error('Cleanup error:', error);
        }
    });
    describe('Pre-signed URL for Download', () => {
        it('should generate pre-signed URL for download', async () => {
            const signedUrl = await s3Service.getSignedUrl(testFileKey, 3600);
            expect(signedUrl).toBeDefined();
            expect(typeof signedUrl).toBe('string');
            expect(signedUrl).toContain('https://');
            expect(signedUrl).toContain('X-Amz-Algorithm');
            expect(signedUrl).toContain('X-Amz-Signature');
            expect(signedUrl).toContain('X-Amz-Expires');
        });
        it('should verify URL works and file can be downloaded', async () => {
            const signedUrl = await s3Service.getSignedUrl(testFileKey, 3600);
            const response = await httpGet(signedUrl);
            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
            expect(response.data.toString()).toBe(testFileBuffer.toString());
        });
        it('should validate expiration time is within valid range', async () => {
            const url1 = await s3Service.getSignedUrl(testFileKey, 1);
            expect(url1).toBeDefined();
            const url2 = await s3Service.getSignedUrl(testFileKey, 86400);
            expect(url2).toBeDefined();
            const url3 = await s3Service.getSignedUrl(testFileKey);
            expect(url3).toBeDefined();
        });
        it('should reject expiration time less than 1 second', async () => {
            await expect(s3Service.getSignedUrl(testFileKey, 0)).rejects.toThrow(auth_1.ValidationError);
            await expect(s3Service.getSignedUrl(testFileKey, -1)).rejects.toThrow(auth_1.ValidationError);
        });
        it('should reject expiration time greater than 86400 seconds', async () => {
            await expect(s3Service.getSignedUrl(testFileKey, 86401)).rejects.toThrow(auth_1.ValidationError);
            await expect(s3Service.getSignedUrl(testFileKey, 100000)).rejects.toThrow(auth_1.ValidationError);
        });
        it('should use default expiration of 3600 seconds for resume files', async () => {
            const signedUrl = await s3Service.getSignedUrl(testFileKey);
            expect(signedUrl).toContain('X-Amz-Expires');
            const expiresMatch = signedUrl.match(/X-Amz-Expires=(\d+)/);
            expect(expiresMatch).toBeTruthy();
            if (expiresMatch) {
                const expires = parseInt(expiresMatch[1], 10);
                expect(expires).toBe(3600);
            }
        });
    });
    describe('Pre-signed URL for Upload', () => {
        it('should generate pre-signed URL for upload', async () => {
            const uploadKey = `test-presigned-urls/upload-test-${Date.now()}.txt`;
            const uploadUrlResult = await s3Service.generateUploadUrl(uploadKey, {
                contentType: 'text/plain',
                expiresIn: 3600
            });
            expect(uploadUrlResult).toBeDefined();
            expect(uploadUrlResult.url).toBeDefined();
            expect(uploadUrlResult.key).toBe(uploadKey);
            expect(uploadUrlResult.fields).toBeDefined();
            expect(uploadUrlResult.fields['Content-Type']).toBe('text/plain');
        });
        it('should include content type restrictions in pre-signed URL', async () => {
            const uploadKey = `test-presigned-urls/upload-test-${Date.now()}.json`;
            const uploadUrlResult = await s3Service.generateUploadUrl(uploadKey, {
                contentType: 'application/json',
                expiresIn: 1800
            });
            expect(uploadUrlResult.fields['Content-Type']).toBe('application/json');
            expect(uploadUrlResult.url).toContain('Content-Type');
        });
        it('should upload file using pre-signed URL', async () => {
            const uploadKey = `test-presigned-urls/upload-test-${Date.now()}.txt`;
            const uploadContent = Buffer.from('Test content uploaded via pre-signed URL');
            const uploadUrlResult = await s3Service.generateUploadUrl(uploadKey, {
                contentType: 'text/plain',
                expiresIn: 3600
            });
            const response = await httpPut(uploadUrlResult.url, uploadContent, {
                'Content-Type': uploadUrlResult.fields['Content-Type']
            });
            expect(response.status).toBe(200);
            const uploadSucceeded = await s3Service.verifyUpload(uploadKey);
            expect(uploadSucceeded).toBe(true);
            const downloadedContent = await s3Service.download(uploadKey);
            expect(downloadedContent.toString()).toBe(uploadContent.toString());
            await s3Service.deleteFile(uploadKey);
        });
        it('should validate required parameters for upload URL generation', async () => {
            const uploadKey = `test-presigned-urls/upload-test-${Date.now()}.txt`;
            await expect(s3Service.generateUploadUrl(uploadKey, {})).rejects.toThrow(auth_1.ValidationError);
            await expect(s3Service.generateUploadUrl('', {
                contentType: 'text/plain'
            })).rejects.toThrow(auth_1.ValidationError);
        });
        it('should validate expiration time for upload URLs', async () => {
            const uploadKey = `test-presigned-urls/upload-test-${Date.now()}.txt`;
            await expect(s3Service.generateUploadUrl(uploadKey, {
                contentType: 'text/plain',
                expiresIn: 0
            })).rejects.toThrow(auth_1.ValidationError);
            await expect(s3Service.generateUploadUrl(uploadKey, {
                contentType: 'text/plain',
                expiresIn: 86401
            })).rejects.toThrow(auth_1.ValidationError);
        });
        it('should verify upload fails for non-existent file', async () => {
            const nonExistentKey = `test-presigned-urls/non-existent-${Date.now()}.txt`;
            const uploadSucceeded = await s3Service.verifyUpload(nonExistentKey);
            expect(uploadSucceeded).toBe(false);
        });
    });
    describe('Pre-signed URL Error Handling', () => {
        it('should handle download URL generation for non-existent file', async () => {
            const nonExistentKey = `test-presigned-urls/non-existent-${Date.now()}.txt`;
            const signedUrl = await s3Service.getSignedUrl(nonExistentKey, 3600);
            expect(signedUrl).toBeDefined();
            await expect(httpGet(signedUrl)).rejects.toThrow();
        });
        it('should handle expired pre-signed URLs', async () => {
            const signedUrl = await s3Service.getSignedUrl(testFileKey, 1);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await expect(httpGet(signedUrl)).rejects.toThrow();
        }, 10000);
        it('should handle upload with wrong content type', async () => {
            const uploadKey = `test-presigned-urls/upload-test-${Date.now()}.txt`;
            const uploadContent = Buffer.from('Test content');
            const uploadUrlResult = await s3Service.generateUploadUrl(uploadKey, {
                contentType: 'text/plain',
                expiresIn: 3600
            });
            try {
                await httpPut(uploadUrlResult.url, uploadContent, {
                    'Content-Type': 'application/json'
                });
                await s3Service.deleteFile(uploadKey);
            }
            catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
    describe('Upload Verification', () => {
        it('should verify successful upload', async () => {
            const uploadKey = `test-presigned-urls/verify-test-${Date.now()}.txt`;
            const uploadContent = Buffer.from('Verification test content');
            await s3Service.upload(uploadKey, uploadContent, {
                contentType: 'text/plain'
            });
            const uploadSucceeded = await s3Service.verifyUpload(uploadKey);
            expect(uploadSucceeded).toBe(true);
            await s3Service.deleteFile(uploadKey);
        });
        it('should return false for non-existent file verification', async () => {
            const nonExistentKey = `test-presigned-urls/non-existent-verify-${Date.now()}.txt`;
            const uploadSucceeded = await s3Service.verifyUpload(nonExistentKey);
            expect(uploadSucceeded).toBe(false);
        });
    });
    describe('Multiple File Operations', () => {
        it('should handle multiple concurrent pre-signed URL generations', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(s3Service.getSignedUrl(testFileKey, 3600));
            }
            const urls = await Promise.all(promises);
            expect(urls.length).toBe(5);
            urls.forEach(url => {
                expect(url).toBeDefined();
                expect(url).toContain('https://');
            });
            const uniqueUrls = new Set(urls);
            expect(uniqueUrls.size).toBe(5);
        });
        it('should handle multiple concurrent uploads via pre-signed URLs', async () => {
            const uploadPromises = [];
            const uploadKeys = [];
            for (let i = 0; i < 3; i++) {
                const uploadKey = `test-presigned-urls/concurrent-upload-${Date.now()}-${i}.txt`;
                uploadKeys.push(uploadKey);
                uploadPromises.push(s3Service.generateUploadUrl(uploadKey, {
                    contentType: 'text/plain',
                    expiresIn: 3600
                }));
            }
            const uploadResults = await Promise.all(uploadPromises);
            const uploadFilePromises = uploadResults.map((result, i) => {
                const content = Buffer.from(`Concurrent upload test ${i}`);
                return httpPut(result.url, content, {
                    'Content-Type': result.fields['Content-Type']
                });
            });
            await Promise.all(uploadFilePromises);
            const verifyPromises = uploadKeys.map(key => s3Service.verifyUpload(key));
            const verifyResults = await Promise.all(verifyPromises);
            verifyResults.forEach(result => {
                expect(result).toBe(true);
            });
            const cleanupPromises = uploadKeys.map(key => s3Service.deleteFile(key));
            await Promise.all(cleanupPromises);
        }, 15000);
    });
});
//# sourceMappingURL=s3-presigned-url.integration.test.js.map