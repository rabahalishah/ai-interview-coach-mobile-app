import { PrismaClient } from '@prisma/client';
export declare function safeEmailVerificationOTPDeleteMany(prisma: PrismaClient, where: {
    email: string | {
        contains: string;
    };
}): Promise<void>;
//# sourceMappingURL=safePrismaCleanup.d.ts.map