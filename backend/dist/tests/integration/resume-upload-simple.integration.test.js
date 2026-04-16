"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ProfileService_1 = require("../../src/services/ProfileService");
const S3Service_1 = require("../../src/services/S3Service");
const OpenAIService_1 = require("../../src/services/OpenAIService");
const prisma_1 = __importDefault(require("../../src/lib/prisma"));
const testUserFactory_1 = require("./helpers/testUserFactory");
const auth_1 = require("../../src/types/auth");
describe('Resume Upload and Processing - Integration Test', () => {
    let profileService;
    let s3Service;
    let openaiService;
    let testUserId;
    let testPdfBuffer;
    beforeAll(async () => {
        const s3Config = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret',
            region: process.env.AWS_REGION || 'us-east-1',
            bucketName: process.env.AWS_S3_BUCKET || 'test-bucket'
        };
        s3Service = new S3Service_1.S3Service(s3Config);
        const openaiConfig = {
            gptApiKey: process.env.OPENAI_API_KEY || 'test-gpt-key',
            whisperApiKey: process.env.WHISPER_API_KEY || 'test-whisper-key',
            maxRetries: 3,
            timeout: 60000
        };
        openaiService = new OpenAIService_1.OpenAIService(openaiConfig);
        profileService = new ProfileService_1.ProfileService(s3Service, openaiService, prisma_1.default);
        const testUser = await (0, testUserFactory_1.createVerifiedUserWithProfile)('resume-simple-test@example.com', 'Password123!');
        testUserId = testUser.id;
        testPdfBuffer = createTestPdfResume();
    });
    afterAll(async () => {
        try {
            const profile = await prisma_1.default.userProfile.findUnique({
                where: { userId: testUserId }
            });
            if (profile?.resumeS3Key) {
                try {
                    await s3Service.deleteFile(profile.resumeS3Key);
                }
                catch (error) {
                }
            }
            await prisma_1.default.userProfile.deleteMany({
                where: { userId: testUserId }
            });
            await prisma_1.default.user.deleteMany({
                where: { email: 'resume-simple-test@example.com' }
            });
        }
        catch (error) {
            console.error('Cleanup error:', error);
        }
        await prisma_1.default.$disconnect();
    });
    describe('End-to-End Resume Upload Flow', () => {
        it('should upload PDF resume and process it successfully', async () => {
            const s3Key = await profileService.uploadResume(testUserId, testPdfBuffer, 'test-resume.pdf');
            expect(s3Key).toBeDefined();
            expect(s3Key).toContain('resumes/');
            expect(s3Key).toContain(testUserId);
            const fileExists = await s3Service.fileExists(s3Key);
            expect(fileExists).toBe(true);
            let profile = await prisma_1.default.userProfile.findUnique({
                where: { userId: testUserId }
            });
            expect(profile?.resumeS3Key).toBe(s3Key);
            await new Promise(resolve => setTimeout(resolve, 8000));
            profile = await prisma_1.default.userProfile.findUnique({
                where: { userId: testUserId }
            });
            expect(profile?.extractedSkills).toBeDefined();
            expect(Array.isArray(profile?.extractedSkills)).toBe(true);
            expect(profile?.extractedSkills.length).toBeGreaterThan(0);
            expect(profile?.experienceLevel).toBeDefined();
            expect(['entry', 'mid', 'senior']).toContain(profile?.experienceLevel);
            const skills = profile?.extractedSkills || [];
            const hasRelevantSkills = skills.some(skill => {
                const lowerSkill = skill.toLowerCase();
                return lowerSkill.includes('javascript') ||
                    lowerSkill.includes('python') ||
                    lowerSkill.includes('react') ||
                    lowerSkill.includes('node') ||
                    lowerSkill.includes('typescript');
            });
            expect(hasRelevantSkills).toBe(true);
        }, 30000);
        it('should handle validation errors for invalid file types', async () => {
            const invalidBuffer = Buffer.from('This is not a valid resume file');
            await expect(profileService.uploadResume(testUserId, invalidBuffer, 'invalid.txt')).rejects.toThrow(auth_1.ValidationError);
        });
        it('should handle validation errors for empty files', async () => {
            await expect(profileService.uploadResume(testUserId, Buffer.alloc(0), 'empty.pdf')).rejects.toThrow(auth_1.ValidationError);
        });
        it('should handle non-existent user gracefully', async () => {
            const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
            await expect(profileService.uploadResume(nonExistentUserId, testPdfBuffer, 'test.pdf')).rejects.toThrow(auth_1.NotFoundError);
        });
        it('should generate valid signed URL for resume download', async () => {
            await profileService.uploadResume(testUserId, testPdfBuffer, 'download-test.pdf');
            const signedUrl = await profileService.getResumeUrl(testUserId);
            expect(signedUrl).toBeDefined();
            expect(signedUrl).toContain('https://');
            expect(signedUrl).toContain('X-Amz-Algorithm');
            expect(signedUrl).toContain('X-Amz-Signature');
        });
    });
});
function createTestPdfResume() {
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 1200
>>
stream
BT
/F1 18 Tf
250 750 Td
(John Doe) Tj
0 -30 Td
/F1 14 Tf
(Software Engineer) Tj
0 -30 Td
/F1 10 Tf
(Email: john.doe@example.com | Phone: 555-123-4567) Tj
0 -40 Td
/F1 12 Tf
(PROFESSIONAL SUMMARY) Tj
0 -20 Td
/F1 10 Tf
(Experienced software engineer with 5 years of experience in full-stack development.) Tj
0 -15 Td
(Proficient in JavaScript, TypeScript, Python, and React. Strong background in building) Tj
0 -15 Td
(scalable web applications and RESTful APIs.) Tj
0 -30 Td
/F1 12 Tf
(TECHNICAL SKILLS) Tj
0 -20 Td
/F1 10 Tf
(Programming Languages: JavaScript, TypeScript, Python, Java) Tj
0 -15 Td
(Frontend: React, Vue.js, HTML5, CSS3, Redux) Tj
0 -15 Td
(Backend: Node.js, Express, Django, Flask, Spring Boot) Tj
0 -15 Td
(Databases: PostgreSQL, MongoDB, MySQL, Redis) Tj
0 -15 Td
(Cloud & DevOps: AWS, Docker, Kubernetes, Jenkins, CI/CD) Tj
0 -15 Td
(Tools: Git, Jest, Webpack, Babel, ESLint) Tj
0 -30 Td
/F1 12 Tf
(WORK EXPERIENCE) Tj
0 -20 Td
/F1 11 Tf
(Senior Software Engineer - Tech Corp) Tj
0 -15 Td
/F1 10 Tf
(January 2021 - Present) Tj
0 -15 Td
(Led development of microservices architecture using Node.js and Docker) Tj
0 -15 Td
(Implemented CI/CD pipelines reducing deployment time by 50%) Tj
0 -30 Td
/F1 11 Tf
(Software Engineer - StartupXYZ) Tj
0 -15 Td
/F1 10 Tf
(June 2019 - December 2020) Tj
0 -15 Td
(Built RESTful APIs using Express and PostgreSQL) Tj
0 -15 Td
(Developed responsive web applications with React and Redux) Tj
0 -30 Td
/F1 12 Tf
(EDUCATION) Tj
0 -20 Td
/F1 10 Tf
(Bachelor of Science in Computer Science) Tj
0 -15 Td
(University of Technology, 2019) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
1569
%%EOF`;
    return Buffer.from(pdfContent, 'utf-8');
}
//# sourceMappingURL=resume-upload-simple.integration.test.js.map