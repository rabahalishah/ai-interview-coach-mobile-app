"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OnboardingService_1 = require("../../../src/services/OnboardingService");
describe('mergeVoiceExtractIntoProfile', () => {
    const baseCurrent = {
        fullName: 'Jane Doe',
        currentJobTitle: 'Engineer',
        extractedSkills: ['TypeScript']
    };
    it('does not overwrite existing scalar fields', () => {
        const voice = {
            skills: ['Python'],
            experienceLevel: 'senior',
            industries: ['Tech'],
            jobTitles: ['Staff'],
            summary: '',
            fullName: 'Other Name',
            currentJobTitle: 'CEO',
            currentCompany: 'Acme',
            school: 'MIT',
            degreeInfo: 'BS',
            previousJobTitles: ['Intern']
        };
        const merged = (0, OnboardingService_1.mergeVoiceExtractIntoProfile)(baseCurrent, voice);
        expect(merged.fullName).toBe('Jane Doe');
        expect(merged.currentJobTitle).toBe('Engineer');
        expect(merged.extractedSkills?.sort()).toEqual(['Python', 'TypeScript'].sort());
        expect(merged.currentCompany).toBe('Acme');
        expect(merged.school).toBe('MIT');
    });
    it('fills empty fields from voice extraction', () => {
        const sparse = {
            fullName: 'Jane Doe',
            extractedSkills: []
        };
        const voice = {
            skills: ['Go'],
            industries: [],
            jobTitles: [],
            summary: '',
            experienceLevel: 'mid',
            currentCompany: 'Corp'
        };
        const merged = (0, OnboardingService_1.mergeVoiceExtractIntoProfile)(sparse, voice);
        expect(merged.currentCompany).toBe('Corp');
        expect(merged.experienceLevel).toBe('mid');
        expect(merged.extractedSkills).toEqual(['Go']);
    });
    it('unions previous job titles', () => {
        const current = {
            previousJobTitles: ['A'],
            extractedSkills: []
        };
        const voice = {
            skills: [],
            industries: [],
            jobTitles: [],
            summary: '',
            experienceLevel: 'entry',
            previousJobTitles: ['B', 'A']
        };
        const merged = (0, OnboardingService_1.mergeVoiceExtractIntoProfile)(current, voice);
        expect(merged.previousJobTitles?.sort()).toEqual(['A', 'B']);
    });
});
//# sourceMappingURL=OnboardingService.test.js.map