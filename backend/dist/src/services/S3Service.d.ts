export interface S3Config {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucketName: string;
}
export interface S3UploadUrlOptions {
    contentType: string;
    maxSizeBytes?: number;
    expiresIn?: number;
}
export interface S3UploadUrlResult {
    url: string;
    key: string;
    fields: Record<string, string>;
}
interface S3Client {
    upload(key: string, buffer: Buffer, options?: any): Promise<string>;
    download(key: string): Promise<Buffer>;
    deleteFile(key: string): Promise<void>;
    getSignedUrl(key: string, expiresIn: number): Promise<string>;
    generateUploadUrl(key: string, options: S3UploadUrlOptions): Promise<S3UploadUrlResult>;
    verifyUpload(key: string): Promise<boolean>;
}
export declare class S3Service implements S3Client {
    private s3;
    private bucketName;
    constructor(config: S3Config);
    upload(key: string, buffer: Buffer, options?: {
        contentType?: string;
        metadata?: Record<string, string>;
    }): Promise<string>;
    download(key: string): Promise<Buffer>;
    getSignedUrl(key: string, expiresIn?: number): Promise<string>;
    generateUploadUrl(key: string, options: S3UploadUrlOptions): Promise<S3UploadUrlResult>;
    verifyUpload(key: string): Promise<boolean>;
    deleteFile(key: string): Promise<void>;
    fileExists(key: string): Promise<boolean>;
    validateFile(buffer: Buffer, filename: string, options?: {
        allowedTypes?: string[];
        maxSizeBytes?: number;
    }): void;
    generateFileKey(prefix: string, userId: string, filename: string): string;
    healthCheck(): Promise<boolean>;
}
export declare const createS3Service: (config: S3Config) => S3Service;
export {};
//# sourceMappingURL=S3Service.d.ts.map