import * as fc from 'fast-check';
export declare const arbitraries: {
    email: () => fc.Arbitrary<string>;
    password: () => fc.Arbitrary<string>;
    userId: () => fc.Arbitrary<string>;
    sessionId: () => fc.Arbitrary<string>;
    score: () => fc.Arbitrary<number>;
    subscriptionTier: () => fc.Arbitrary<string>;
    industry: () => fc.Arbitrary<string>;
    jobTitle: () => fc.Arbitrary<string>;
    audioBuffer: () => fc.Arbitrary<Uint8Array<ArrayBufferLike>>;
    resumeText: () => fc.Arbitrary<string>;
};
//# sourceMappingURL=setup-properties.d.ts.map