export interface TextExtractor {
    canHandle(filename: string): boolean;
    extract(buffer: Buffer): Promise<string>;
}
export declare class PDFTextExtractor implements TextExtractor {
    canHandle(filename: string): boolean;
    extract(buffer: Buffer): Promise<string>;
}
export declare class DOCXTextExtractor implements TextExtractor {
    canHandle(filename: string): boolean;
    extract(buffer: Buffer): Promise<string>;
}
export declare class ResumeTextExtractor {
    private extractors;
    constructor();
    extractText(buffer: Buffer, filename: string): Promise<string>;
    isSupported(filename: string): boolean;
    getSupportedExtensions(): string[];
}
//# sourceMappingURL=ResumeTextExtractor.d.ts.map