export declare function createVerifiedUserWithProfile(email: string, password: string): Promise<{
    email: string;
    subscriptionTier: string;
    emailVerified: boolean;
    id: string;
    googleId: string | null;
    pendingEmail: string | null;
    passwordHash: string | null;
    authProvider: string;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=testUserFactory.d.ts.map