export declare function getVerifiedAuthToken(app: import('express').Application, email: string, password: string): Promise<{
    token: string;
    userId: string;
}>;
export declare function verifyUserEmailInDbAndLogin(app: import('express').Application, email: string, password: string): Promise<{
    token: string;
    userId: string;
}>;
//# sourceMappingURL=verifiedAuth.d.ts.map