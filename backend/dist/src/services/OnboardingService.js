"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
exports.mergeVoiceExtractIntoProfile = mergeVoiceExtractIntoProfile;
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../types/auth");
const validation_1 = require("../utils/validation");
function nonEmpty(s) {
    return typeof s === 'string' && s.trim().length > 0;
}
function resumeDataToUpdate(data) {
    const u = {
        extractedSkills: data.skills,
        experienceLevel: data.experienceLevel
    };
    if (data.fullName)
        u.fullName = data.fullName;
    if (data.currentJobTitle)
        u.currentJobTitle = data.currentJobTitle;
    if (data.currentCompany)
        u.currentCompany = data.currentCompany;
    if (data.school)
        u.school = data.school;
    if (data.degreeInfo)
        u.degreeInfo = data.degreeInfo;
    if (data.previousJobTitles?.length)
        u.previousJobTitles = data.previousJobTitles;
    if (data.industries?.length)
        u.targetIndustry = data.industries[0];
    if (data.jobTitles?.length)
        u.targetJobTitle = data.jobTitles[0];
    return u;
}
function uniqStrings(a) {
    return [...new Set(a.map((s) => s.trim()).filter(Boolean))];
}
function mergeVoiceExtractIntoProfile(current, voiceData) {
    const v = resumeDataToUpdate(voiceData);
    const out = { ...current };
    const fillScalar = (key) => {
        const incoming = v[key];
        if (incoming === undefined || incoming === null)
            return;
        if (typeof incoming === 'string' && !nonEmpty(incoming))
            return;
        const cur = out[key];
        const curStr = cur == null ? '' : String(cur);
        if (!nonEmpty(curStr)) {
            out[key] = incoming;
        }
    };
    for (const key of [
        'fullName',
        'currentJobTitle',
        'currentCompany',
        'school',
        'degreeInfo',
        'experienceLevel'
    ]) {
        fillScalar(key);
    }
    if (v.targetIndustry && !nonEmpty(out.targetIndustry)) {
        out.targetIndustry = v.targetIndustry;
    }
    if (v.targetJobTitle && !nonEmpty(out.targetJobTitle)) {
        out.targetJobTitle = v.targetJobTitle;
    }
    if (v.previousJobTitles?.length) {
        out.previousJobTitles = uniqStrings([...(out.previousJobTitles ?? []), ...v.previousJobTitles]);
    }
    if (v.extractedSkills?.length) {
        out.extractedSkills = uniqStrings([...(out.extractedSkills ?? []), ...v.extractedSkills]);
    }
    return out;
}
function buildDeterministicContext(profile, transcript) {
    const lines = [];
    const entries = {};
    const add = (k, v) => {
        if (v === undefined || v === null)
            return;
        if (Array.isArray(v)) {
            if (!v.length)
                return;
            entries[k] = v.join(', ');
            lines.push(`${k}: ${entries[k]}`);
            return;
        }
        if (!nonEmpty(v))
            return;
        entries[k] = v.trim();
        lines.push(`${k}: ${entries[k]}`);
    };
    add('fullName', profile.fullName ?? undefined);
    add('currentJobTitle', profile.currentJobTitle ?? undefined);
    add('currentCompany', profile.currentCompany ?? undefined);
    add('school', profile.school ?? undefined);
    add('degreeInfo', profile.degreeInfo ?? undefined);
    add('previousJobTitles', profile.previousJobTitles);
    add('targetIndustry', profile.targetIndustry ?? undefined);
    add('targetJobTitle', profile.targetJobTitle ?? undefined);
    add('experienceLevel', profile.experienceLevel ?? undefined);
    add('skills', profile.extractedSkills);
    return {
        personalizationSummary: lines.join('\n'),
        fields: entries,
        introductionTranscript: transcript?.trim() || undefined,
        builtAt: new Date().toISOString()
    };
}
function profileRowToUpdate(p) {
    return {
        fullName: p.fullName ?? undefined,
        currentJobTitle: p.currentJobTitle ?? undefined,
        currentCompany: p.currentCompany ?? undefined,
        school: p.school ?? undefined,
        degreeInfo: p.degreeInfo ?? undefined,
        previousJobTitles: p.previousJobTitles,
        targetIndustry: p.targetIndustry ?? undefined,
        targetJobTitle: p.targetJobTitle ?? undefined,
        experienceLevel: p.experienceLevel ?? undefined,
        extractedSkills: p.extractedSkills
    };
}
function prismaScalarsFromUpdate(u) {
    const out = {};
    if (u.fullName !== undefined)
        out.fullName = u.fullName;
    if (u.currentJobTitle !== undefined)
        out.currentJobTitle = u.currentJobTitle;
    if (u.currentCompany !== undefined)
        out.currentCompany = u.currentCompany;
    if (u.school !== undefined)
        out.school = u.school;
    if (u.degreeInfo !== undefined)
        out.degreeInfo = u.degreeInfo;
    if (u.previousJobTitles !== undefined)
        out.previousJobTitles = u.previousJobTitles;
    if (u.targetIndustry !== undefined)
        out.targetIndustry = u.targetIndustry;
    if (u.targetJobTitle !== undefined)
        out.targetJobTitle = u.targetJobTitle;
    if (u.experienceLevel !== undefined)
        out.experienceLevel = u.experienceLevel;
    if (u.extractedSkills !== undefined)
        out.extractedSkills = u.extractedSkills;
    return out;
}
class OnboardingService {
    constructor(profileService, openaiService, _s3Service, prismaInstance) {
        this.profileService = profileService;
        this.openaiService = openaiService;
        this._s3Service = _s3Service;
        this.prismaInstance = prismaInstance;
    }
    get prisma() {
        return this.prismaInstance || prisma_1.default;
    }
    async assertNotCompleted(userId) {
        const u = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { onboardingCompletedAt: true }
        });
        if (!u) {
            throw new auth_1.NotFoundError('User not found');
        }
        if (u.onboardingCompletedAt) {
            throw new auth_1.ConflictError('Onboarding is already complete');
        }
    }
    hasPrimaryInProfile(p) {
        return !!(p.resumeS3Key || nonEmpty(p.fullName));
    }
    async primary(userId, input) {
        if (!validation_1.ValidationUtils.isValidUUID(userId)) {
            throw new auth_1.ValidationError('Invalid user ID format');
        }
        await this.assertNotCompleted(userId);
        const hasResume = !!(input.resumeBuffer?.length && input.resumeFilename);
        const hasManual = !!input.manual && Object.keys(input.manual).length > 0;
        if (hasResume === hasManual) {
            throw new auth_1.ValidationError('Provide exactly one of: resume file or manual profile JSON');
        }
        if (hasResume) {
            await this.profileService.uploadResume(userId, input.resumeBuffer, input.resumeFilename);
        }
        else {
            const manual = validation_1.ValidationUtils.validate(input.manual, validation_1.profileSchemas.updateProfile);
            if (!nonEmpty(manual.fullName)) {
                throw new auth_1.ValidationError('Full name is required for manual entry');
            }
            await this.profileService.updateProfile(userId, manual);
        }
        const row = await this.prisma.userProfile.findUnique({ where: { userId } });
        if (row) {
            await this.prisma.userProfile.update({
                where: { userId },
                data: {
                    aiAttributes: {
                        ...row.aiAttributes,
                        onboardingPrimaryAt: new Date().toISOString()
                    }
                }
            });
        }
        return this.profileService.getProfile(userId);
    }
    async voice(userId, audioBuffer, audioFilename) {
        if (!validation_1.ValidationUtils.isValidUUID(userId)) {
            throw new auth_1.ValidationError('Invalid user ID format');
        }
        await this.assertNotCompleted(userId);
        if (!audioBuffer?.length || !audioFilename) {
            throw new auth_1.ValidationError('Audio file is required');
        }
        const profileRow = await this.prisma.userProfile.findUnique({ where: { userId } });
        if (!profileRow) {
            throw new auth_1.NotFoundError('Profile not found');
        }
        const introductionTranscript = (await this.openaiService.transcribeAudio(audioBuffer, audioFilename)).text;
        const voiceExtract = await this.profileService.extractStructuredResumeData(introductionTranscript);
        const baseline = profileRowToUpdate(profileRow);
        const merged = mergeVoiceExtractIntoProfile(baseline, voiceExtract);
        const nextAttrs = {
            ...(profileRow.aiAttributes ?? {}),
            introductionTranscript
        };
        await this.prisma.userProfile.update({
            where: { userId },
            data: {
                ...prismaScalarsFromUpdate(merged),
                aiAttributes: nextAttrs
            }
        });
        return this.profileService.getProfile(userId);
    }
    async complete(userId) {
        if (!validation_1.ValidationUtils.isValidUUID(userId)) {
            throw new auth_1.ValidationError('Invalid user ID format');
        }
        await this.assertNotCompleted(userId);
        const profileNow = await this.prisma.userProfile.findUnique({ where: { userId } });
        if (!profileNow) {
            throw new auth_1.NotFoundError('Profile not found');
        }
        if (!this.hasPrimaryInProfile(profileNow)) {
            throw new auth_1.ValidationError('Complete primary onboarding first: upload a resume or save manual profile with full name.');
        }
        const fromDb = profileRowToUpdate(profileNow);
        const attrs = profileNow.aiAttributes ?? {};
        const transcript = typeof attrs.introductionTranscript === 'string' ? attrs.introductionTranscript : undefined;
        const context = buildDeterministicContext(fromDb, transcript);
        await this.prisma.$transaction(async (tx) => {
            await tx.userProfile.update({
                where: { userId },
                data: {
                    aiAttributes: {
                        ...attrs,
                        personalizationContext: context
                    }
                }
            });
            await tx.user.update({
                where: { id: userId },
                data: { onboardingCompletedAt: new Date() }
            });
        });
        return this.profileService.getProfile(userId);
    }
}
exports.OnboardingService = OnboardingService;
//# sourceMappingURL=OnboardingService.js.map