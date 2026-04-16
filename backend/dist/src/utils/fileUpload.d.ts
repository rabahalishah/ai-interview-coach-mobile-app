import multer from 'multer';
export declare const resumeUpload: multer.Multer;
export declare const audioUpload: multer.Multer;
export declare const onboardingVoiceUpload: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const validateFileBuffer: (buffer: Buffer, filename: string, options?: {
    allowedTypes?: string[];
    maxSizeBytes?: number;
    minSizeBytes?: number;
}) => void;
export declare const extractFileMetadata: (file: Express.Multer.File) => {
    originalName: string;
    mimeType: string;
    size: number;
    extension: string;
};
export declare const sanitizeFilename: (filename: string) => string;
export declare const getContentTypeFromExtension: (extension: string) => string;
//# sourceMappingURL=fileUpload.d.ts.map