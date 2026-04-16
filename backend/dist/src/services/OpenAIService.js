"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = exports.OpenAIServiceError = exports.validateOpenAIConfig = exports.loadOpenAIConfig = exports.INTERVIEW_ANALYSIS_SYSTEM_PROMPT = exports.RESUME_DESIRED_MAX_COMPLETION = exports.ANALYSIS_DESIRED_MAX_COMPLETION = void 0;
exports.getContextLimitForModel = getContextLimitForModel;
exports.computeSafeMaxCompletionTokens = computeSafeMaxCompletionTokens;
const openai_1 = __importDefault(require("openai"));
const ErrorHandlingService_1 = require("./ErrorHandlingService");
const auth_1 = require("../types/auth");
const constants_1 = require("../utils/constants");
const MonitoringService_1 = require("./MonitoringService");
const interviewConversation_1 = require("../utils/interviewConversation");
const interviewConversation_2 = require("../types/interviewConversation");
const sessionAiAnalysis_1 = require("../utils/sessionAiAnalysis");
const analysisTokens_1 = require("../utils/analysisTokens");
const openaiCost_1 = require("../utils/openaiCost");
const openAiTransportErrorDetail_1 = require("../utils/openAiTransportErrorDetail");
const CHARS_PER_TOKEN = 4;
const MAX_GPT_TOKENS = 8000;
exports.ANALYSIS_DESIRED_MAX_COMPLETION = 8000;
exports.RESUME_DESIRED_MAX_COMPLETION = 1500;
const DEFAULT_GPT_MODEL = 'gpt-5-mini';
const DEFAULT_CONTEXT_TOKEN_LIMIT = 400000;
function getContextLimitForModel(model, override) {
    if (override !== undefined && override > 0) {
        return override;
    }
    const m = model.trim().toLowerCase();
    if (m === 'gpt-4' || m === 'gpt-4-0314' || m === 'gpt-4-0613') {
        return 8192;
    }
    return DEFAULT_CONTEXT_TOKEN_LIMIT;
}
function computeSafeMaxCompletionTokens(params) {
    const margin = params.margin ?? 256;
    const minFloor = params.minFloor ?? 1024;
    const minCompletion = 256;
    const contextLimit = getContextLimitForModel(params.model, params.contextLimitOverride);
    const estimatedPrompt = Math.ceil((params.systemText.length + params.userText.length) / CHARS_PER_TOKEN);
    const rawCap = Math.max(0, contextLimit - estimatedPrompt - margin);
    const preferred = Math.min(params.desiredMax, rawCap);
    if (preferred >= minFloor) {
        return preferred;
    }
    return Math.min(params.desiredMax, Math.max(minCompletion, rawCap));
}
const MAX_AUDIO_SIZE = constants_1.FILE_SIZE_LIMITS.AUDIO;
const MAX_ANALYSIS_TRANSCRIPT_CHARS = 1000000;
exports.INTERVIEW_ANALYSIS_SYSTEM_PROMPT = `You are an AI interview analyzer.

You will receive a raw transcript of a real interview conversation generated from speech-to-text (Whisper). The transcript may contain multiple speakers and may not clearly label who is speaking.

Your task is to:

----------------------------------------
STEP 1: IDENTIFY ROLES
----------------------------------------
- Detect all speakers in the conversation.
- Classify each speaker into one of the following roles:
  - "candidate"
  - "interviewer"
  - "other"
  - "unknown"

Rules:
- The "candidate" is the person answering most questions.
- "Interviewers" are the ones asking questions.
- There can be multiple interviewers.
- If unsure, use "unknown".

----------------------------------------
STEP 2: STRUCTURE THE CONVERSATION
----------------------------------------
- Break the transcript into ordered messages.
- Each message must:
  - Have a unique id (string)
  - Include speakerId (consistent per speaker)
  - Include detected role
  - Contain the exact spoken text (cleaned but not re-written)
- DO NOT summarize messages.

----------------------------------------
STEP 3: DETECT QUESTIONS & ANSWERS
----------------------------------------
- Identify interviewer questions and corresponding candidate answers.
- Use this understanding to drive analysis (DO NOT output Q/A separately).
- Maintain flow in messages array.

----------------------------------------
STEP 4: ANALYZE CANDIDATE
----------------------------------------
Generate:

1. feedback:
   - A concise but insightful paragraph summarizing performance.

2. scores (integers 1–5 for each dimension):
   - clarity
   - confidence
   - tone
   - enthusiasm
   - specificity

3. insights:
   - At least 1 key observation.

4. topTraits:
   - At least 2 traits describing the candidate.

5. strengthAreas & strengthInsights:
   - Strengths + explanations.

6. opportunityAreas & opportunityInsights:
   - Areas to improve + explanations.

7. aiAttributes:
   - A non-empty object with useful structured attributes such as:
     - communicationStyle
     - seniorityEstimate
     - domainKnowledge
     - etc.

----------------------------------------
STEP 5: MESSAGE-LEVEL FEEDBACK
----------------------------------------
- For messages where role = "candidate":
  assign:
    feedback.flag = "Good" | "Improvement" | "Neutral"

Guidelines:
- Good → strong, clear, relevant answers
- Improvement → vague, incorrect, weak answers
- Neutral → filler or unclear

----------------------------------------
STEP 6: PARTICIPANTS OBJECT
----------------------------------------
- Create:
  participants.candidate → single candidate
  participants.interviewers → array of interviewers

Each must have:
  - id (same as used in messages)
  - optional displayName (if inferable, otherwise omit)

----------------------------------------
OUTPUT RULES (CRITICAL)
----------------------------------------
- Output ONLY valid JSON
- NO explanations
- NO markdown
- NO extra text
- STRICTLY follow the interface below
- All required fields MUST be present
- Arrays must respect minimum lengths
- Scores must be integers from 1 through 5
- Ensure aiAttributes is NOT empty
- Ensure insights, traits, strengths, opportunities are NOT empty

----------------------------------------
INTERFACE TO FOLLOW EXACTLY
----------------------------------------

type CandidateMessageFlag = 'Good' | 'Improvement' | 'Neutral';
type SpeakerRole = 'interviewer' | 'candidate' | 'other' | 'unknown';

interface SessionAiAnalysis {
  analysisVersion: 2;

  feedback: string;
  scores: {
    clarity: number;
    confidence: number;
    tone: number;
    enthusiasm: number;
    specificity: number;
  };
  insights: [string, ...string[]];

  topTraits: [string, string, ...string[]];
  strengthAreas: [string, ...string[]];
  strengthInsights: [string, ...string[]];
  opportunityAreas: [string, ...string[]];
  opportunityInsights: [string, ...string[]];
  aiAttributes: Record<string, unknown> & { [k: string]: unknown };

  participants: {
    candidate: { id: string; displayName?: string };
    interviewers: Array<{ id: string; displayName?: string }>;
  };

  messages: Array<{
    id: string;
    role: SpeakerRole;
    speakerId: string;
    text: string;
    edited: { isEdited: boolean; editedText?: string };
    feedback?: { flag: CandidateMessageFlag };
  }>;
}

----------------------------------------
INPUT TRANSCRIPT:
----------------------------------------
{{TRANSCRIPT}}`;
const loadOpenAIConfig = () => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing required environment variable: OPENAI_API_KEY');
    }
    if (!process.env.WHISPER_API_KEY) {
        throw new Error('Missing required environment variable: WHISPER_API_KEY');
    }
    const gptModel = (process.env.OPENAI_MODEL || DEFAULT_GPT_MODEL).trim();
    let contextTokenLimit;
    const ctxRaw = process.env.OPENAI_CONTEXT_LIMIT;
    if (ctxRaw !== undefined && ctxRaw !== '') {
        const n = parseInt(ctxRaw, 10);
        if (!Number.isNaN(n) && n > 0) {
            contextTokenLimit = n;
        }
    }
    const tierS = parseInt(process.env.ANALYSIS_TIER_S_MAX_INPUT_TOKENS || '48000', 10);
    const analysisTierSMaxInputTokens = !Number.isNaN(tierS) && tierS >= 1024 ? tierS : 48000;
    const analysisPromptVersion = (process.env.ANALYSIS_PROMPT_VERSION || '1').trim();
    const enableLongTranscriptPipeline = process.env.ENABLE_LONG_TRANSCRIPT_PIPELINE === 'true' || process.env.ENABLE_LONG_TRANSCRIPT_PIPELINE === '1';
    const whisperTimeoutRaw = process.env.OPENAI_WHISPER_TIMEOUT_MS;
    let whisperTimeoutMs = 180000;
    if (whisperTimeoutRaw !== undefined && whisperTimeoutRaw !== '') {
        const w = parseInt(whisperTimeoutRaw, 10);
        if (!Number.isNaN(w) && w >= 1000) {
            whisperTimeoutMs = Math.min(w, 600000);
        }
    }
    return {
        gptApiKey: process.env.OPENAI_API_KEY,
        whisperApiKey: process.env.WHISPER_API_KEY,
        maxRetries: 3,
        timeout: 60000,
        whisperTimeoutMs,
        gptModel,
        analysisTierSMaxInputTokens,
        analysisPromptVersion,
        enableLongTranscriptPipeline,
        ...(contextTokenLimit !== undefined ? { contextTokenLimit } : {})
    };
};
exports.loadOpenAIConfig = loadOpenAIConfig;
const validateOpenAIConfig = (config) => {
    if (!config.gptApiKey || config.gptApiKey.trim() === '') {
        throw new Error('OPENAI_API_KEY (gptApiKey) cannot be empty');
    }
    if (!config.whisperApiKey || config.whisperApiKey.trim() === '') {
        throw new Error('WHISPER_API_KEY (whisperApiKey) cannot be empty');
    }
    if (config.maxRetries < 0 || config.maxRetries > 10) {
        throw new Error('maxRetries must be between 0 and 10');
    }
    if (config.timeout < 1000 || config.timeout > 300000) {
        throw new Error('timeout must be between 1000ms and 300000ms');
    }
    if (config.whisperTimeoutMs < 1000 || config.whisperTimeoutMs > 600000) {
        throw new Error('whisperTimeoutMs must be between 1000ms and 600000ms');
    }
    if (!config.gptModel || config.gptModel.trim() === '') {
        throw new Error('gptModel (OPENAI_MODEL) cannot be empty');
    }
    if (config.contextTokenLimit !== undefined &&
        (!Number.isFinite(config.contextTokenLimit) || config.contextTokenLimit <= 0)) {
        throw new Error('contextTokenLimit (OPENAI_CONTEXT_LIMIT) must be a positive number when set');
    }
    if (!Number.isFinite(config.analysisTierSMaxInputTokens) || config.analysisTierSMaxInputTokens < 1024) {
        throw new Error('analysisTierSMaxInputTokens must be at least 1024');
    }
    if (!config.analysisPromptVersion || config.analysisPromptVersion.trim() === '') {
        throw new Error('analysisPromptVersion cannot be empty');
    }
};
exports.validateOpenAIConfig = validateOpenAIConfig;
class OpenAIServiceError extends Error {
    constructor(message, originalError, retryable = false) {
        super(message);
        this.originalError = originalError;
        this.retryable = retryable;
        this.name = 'OpenAIServiceError';
    }
}
exports.OpenAIServiceError = OpenAIServiceError;
class OpenAIService {
    constructor(config) {
        const base = (0, exports.loadOpenAIConfig)();
        this.config = {
            ...base,
            ...config,
            gptModel: (config?.gptModel ?? base.gptModel).trim(),
            whisperTimeoutMs: config?.whisperTimeoutMs ?? base.whisperTimeoutMs,
            analysisTierSMaxInputTokens: config?.analysisTierSMaxInputTokens ?? base.analysisTierSMaxInputTokens,
            analysisPromptVersion: (config?.analysisPromptVersion ?? base.analysisPromptVersion).trim(),
            enableLongTranscriptPipeline: config?.enableLongTranscriptPipeline ?? base.enableLongTranscriptPipeline
        };
        this.gptClient = new openai_1.default({
            apiKey: this.config.gptApiKey,
            maxRetries: this.config.maxRetries,
            timeout: this.config.timeout
        });
        this.whisperClient = new openai_1.default({
            apiKey: this.config.whisperApiKey,
            maxRetries: 0,
            timeout: this.config.whisperTimeoutMs
        });
    }
    validateAudioBuffer(audioBuffer) {
        if (!audioBuffer || audioBuffer.length === 0) {
            throw new auth_1.ValidationError('Audio buffer cannot be empty');
        }
        if (audioBuffer.length > MAX_AUDIO_SIZE) {
            throw new auth_1.ValidationError(`Audio file size (${audioBuffer.length} bytes) exceeds maximum allowed size of ${MAX_AUDIO_SIZE} bytes (${Math.round(MAX_AUDIO_SIZE / 1024 / 1024)}MB)`);
        }
        if (audioBuffer.length < 1024) {
            throw new auth_1.ValidationError('Audio file is too small to be a valid audio file (minimum 1KB required)');
        }
    }
    validateTextInput(text, fieldName = 'Text', maxEstimatedTokens = MAX_GPT_TOKENS) {
        if (!text || text.trim().length === 0) {
            throw new auth_1.ValidationError(`${fieldName} cannot be empty`);
        }
        const estimatedTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
        if (estimatedTokens > maxEstimatedTokens) {
            throw new auth_1.ValidationError(`${fieldName} is too long (estimated ${estimatedTokens} tokens). Maximum allowed is ${maxEstimatedTokens} tokens (approximately ${maxEstimatedTokens * CHARS_PER_TOKEN} characters)`);
        }
        if (text.trim().length < 10) {
            throw new auth_1.ValidationError(`${fieldName} is too short (minimum 10 characters required for meaningful analysis)`);
        }
    }
    async transcribeAudio(audioBuffer, filename = 'audio.wav') {
        this.validateAudioBuffer(audioBuffer);
        const requestId = `transcribe_audio_${Date.now()}`;
        const startTime = Date.now();
        const whisperDevDetail = process.env.NODE_ENV === 'development';
        let lastWhisperAttemptError;
        console.log('Starting OpenAI Whisper API call', {
            operationType: 'whisper_transcription',
            timestamp: new Date().toISOString(),
            requestId,
            filename,
            bufferSize: audioBuffer.length
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeOpenAIOperation(async () => {
                try {
                    const file = new File([audioBuffer], filename, { type: 'audio/wav' });
                    const transcription = await this.whisperClient.audio.transcriptions.create({
                        file: file,
                        model: 'whisper-1',
                        response_format: 'verbose_json',
                        language: 'en'
                    });
                    return {
                        text: transcription.text,
                        language: transcription.language,
                        duration: transcription.duration
                    };
                }
                catch (attemptErr) {
                    lastWhisperAttemptError = attemptErr;
                    if (whisperDevDetail) {
                        console.error('OpenAI Whisper attempt failed (development detail)', {
                            requestId,
                            filename,
                            ...(0, openAiTransportErrorDetail_1.serializeOpenAiTransportError)(attemptErr)
                        });
                    }
                    throw attemptErr;
                }
            }, requestId, async () => {
                const detail = (0, openAiTransportErrorDetail_1.serializeOpenAiTransportError)(lastWhisperAttemptError);
                console.warn('Whisper API retries exhausted (no fallback transcript)', {
                    operationType: 'whisper_transcription',
                    requestId,
                    reason: 'All retry attempts exhausted',
                    fallbackAction: 'Throwing transcription error',
                    ...(whisperDevDetail ? { lastAttempt: detail } : {})
                });
                if (whisperDevDetail) {
                    console.error('Whisper last failure (full chain, development)', {
                        requestId,
                        ...detail
                    });
                }
                const summary = (0, openAiTransportErrorDetail_1.whisperFailureSummary)(lastWhisperAttemptError);
                const message = whisperDevDetail && summary
                    ? `Transcription failed after retries: ${summary}`
                    : 'Transcription temporarily unavailable (Whisper retries exhausted)';
                const original = lastWhisperAttemptError instanceof Error ? lastWhisperAttemptError : undefined;
                throw new OpenAIServiceError(message, original, true);
            }, { circuitBreakerKey: 'openai-whisper' });
            const responseTime = Date.now() - startTime;
            console.log('OpenAI Whisper API call succeeded', {
                operationType: 'whisper_transcription',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    textLength: result.text.length,
                    language: result.language,
                    duration: result.duration
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('openai', true, responseTime);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            const whisperDev = process.env.NODE_ENV === 'development';
            console.error('OpenAI Whisper API call failed', {
                operationType: 'whisper_transcription',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    filename,
                    bufferSize: audioBuffer.length,
                    errorType: error.name
                },
                ...(whisperDev ? (0, openAiTransportErrorDetail_1.serializeOpenAiTransportError)(error) : {})
            });
            MonitoringService_1.monitoringService.recordAPIOperation('openai', false, responseTime, error.code || error.name || 'UNKNOWN_ERROR');
            throw error;
        }
    }
    async analyzeResponse(transcript, userContext, options) {
        if (!transcript || transcript.trim().length === 0) {
            throw new auth_1.ValidationError('Transcript cannot be empty');
        }
        if (transcript.length > MAX_ANALYSIS_TRANSCRIPT_CHARS) {
            const estimatedTokens = Math.ceil(transcript.length / CHARS_PER_TOKEN);
            throw new auth_1.ValidationError(`Transcript is too long (estimated ${estimatedTokens} tokens). Maximum allowed is ${MAX_ANALYSIS_TRANSCRIPT_CHARS} characters (approximately ${Math.floor(MAX_ANALYSIS_TRANSCRIPT_CHARS / CHARS_PER_TOKEN)} tokens)`);
        }
        const requestId = `analyze_response_${Date.now()}`;
        const startTime = Date.now();
        const systemContent = exports.INTERVIEW_ANALYSIS_SYSTEM_PROMPT.replace('{{TRANSCRIPT}}', () => transcript);
        const userPrompt = this.generateConversationAnalysisPrompt(transcript, userContext);
        const estimatedInputTokens = (0, analysisTokens_1.estimateChatInputTokens)(systemContent, userPrompt, this.config.gptModel);
        const contextLimit = getContextLimitForModel(this.config.gptModel, this.config.contextTokenLimit);
        const reserveTarget = contextLimit <= 20000 ? 1800 : exports.ANALYSIS_DESIRED_MAX_COMPLETION;
        const completionReserve = reserveTarget + 256;
        const fitsContext = estimatedInputTokens + completionReserve <= contextLimit;
        const withinTierSPolicy = estimatedInputTokens <= this.config.analysisTierSMaxInputTokens;
        const tier = fitsContext && withinTierSPolicy ? 'S' : 'L';
        if (tier === 'L' && !this.config.enableLongTranscriptPipeline) {
            throw new auth_1.ValidationError(`This transcript is too long for single-pass analysis (estimated ${estimatedInputTokens} input tokens; tier S max ${this.config.analysisTierSMaxInputTokens}, context limit ${contextLimit}). ` +
                'Set ENABLE_LONG_TRANSCRIPT_PIPELINE=true to enable map-reduce, shorten the transcript, or use a larger-context model.');
        }
        const maxTranscriptTokensEstimate = tier === 'S'
            ? this.config.analysisTierSMaxInputTokens + 12000
            : Math.ceil(MAX_ANALYSIS_TRANSCRIPT_CHARS / CHARS_PER_TOKEN);
        this.validateTextInput(transcript, 'Transcript', maxTranscriptTokensEstimate);
        console.log('Starting OpenAI GPT API call for response analysis', {
            operationType: 'gpt_analysis',
            timestamp: new Date().toISOString(),
            requestId,
            transcriptLength: transcript.length,
            estimatedInputTokens,
            analysisTier: tier,
            userId: userContext.profile.id,
            targetRole: userContext.targetRole?.jobTitle || userContext.profile.targetJobTitle,
            sessionId: options?.sessionId
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeOpenAIOperation(async () => tier === 'S'
                ? this.analyzeConversationSinglePass(transcript, userContext, requestId, tier, options?.sessionId)
                : this.analyzeConversationMapReduce(transcript, userContext, requestId, options?.sessionId), requestId, async () => {
                console.warn('GPT API fallback triggered for response analysis', {
                    operationType: 'gpt_analysis',
                    requestId,
                    reason: 'All retry attempts exhausted',
                    fallbackAction: 'Using basic text analysis'
                });
                return this.generateFallbackAnalysis(transcript, userContext);
            });
            const { analysis } = result;
            const responseTime = Date.now() - startTime;
            console.log('OpenAI GPT API call for response analysis succeeded', {
                operationType: 'gpt_analysis',
                requestId,
                responseTimeMs: responseTime,
                sessionId: options?.sessionId,
                metadata: {
                    feedbackLength: analysis.feedback.length,
                    insightsCount: analysis.insights.length,
                    averageScore: Object.values(analysis.scores).reduce((a, b) => a + b, 0) / Object.keys(analysis.scores).length
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('openai', true, responseTime);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('OpenAI GPT API call for response analysis failed', {
                operationType: 'gpt_analysis',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    transcriptLength: transcript.length,
                    userId: userContext.profile.id,
                    targetRole: userContext.targetRole?.jobTitle || userContext.profile.targetJobTitle,
                    errorType: error.name,
                    sessionId: options?.sessionId
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('openai', false, responseTime, error.code || error.name || 'UNKNOWN_ERROR');
            throw error;
        }
    }
    async extractResumeData(resumeText) {
        this.validateTextInput(resumeText, 'Resume text');
        const requestId = `extract_resume_${Date.now()}`;
        const startTime = Date.now();
        console.log('Starting OpenAI GPT API call for resume extraction', {
            operationType: 'gpt_resume_extraction',
            timestamp: new Date().toISOString(),
            requestId,
            resumeTextLength: resumeText.length
        });
        try {
            const result = await ErrorHandlingService_1.errorHandlingService.executeOpenAIOperation(async () => {
                const prompt = this.generateResumeExtractionPrompt(resumeText);
                const resumeSystem = 'You are an expert resume parser. Extract structured information from resumes and return it in JSON format.';
                const resumeMaxTokens = computeSafeMaxCompletionTokens({
                    model: this.config.gptModel,
                    systemText: resumeSystem,
                    userText: prompt,
                    desiredMax: exports.RESUME_DESIRED_MAX_COMPLETION,
                    margin: 256,
                    minFloor: 256,
                    contextLimitOverride: this.config.contextTokenLimit
                });
                const completion = await this.gptClient.chat.completions.create({
                    model: this.config.gptModel,
                    messages: [
                        {
                            role: 'system',
                            content: resumeSystem
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: resumeMaxTokens
                });
                this.logChatCompletionUsage(completion, {
                    requestId,
                    phase: 'resume_extraction'
                });
                const responseText = completion.choices[0]?.message?.content;
                if (!responseText) {
                    throw new OpenAIServiceError('Empty response from GPT API');
                }
                return this.parseResumeData(responseText);
            }, requestId, async () => {
                console.warn('GPT API fallback triggered for resume extraction', {
                    operationType: 'gpt_resume_extraction',
                    requestId,
                    reason: 'All retry attempts exhausted',
                    fallbackAction: 'Using basic keyword extraction'
                });
                return this.generateFallbackResumeData(resumeText);
            });
            const responseTime = Date.now() - startTime;
            console.log('OpenAI GPT API call for resume extraction succeeded', {
                operationType: 'gpt_resume_extraction',
                requestId,
                responseTimeMs: responseTime,
                metadata: {
                    skillsCount: result.skills.length,
                    experienceLevel: result.experienceLevel,
                    industriesCount: result.industries.length,
                    jobTitlesCount: result.jobTitles.length
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('openai', true, responseTime);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('OpenAI GPT API call for resume extraction failed', {
                operationType: 'gpt_resume_extraction',
                requestId,
                responseTimeMs: responseTime,
                errorCode: error.code || 'UNKNOWN',
                errorMessage: error.message,
                errorContext: {
                    resumeTextLength: resumeText.length,
                    errorType: error.name
                }
            });
            MonitoringService_1.monitoringService.recordAPIOperation('openai', false, responseTime, error.code || error.name || 'UNKNOWN_ERROR');
            throw error;
        }
    }
    logChatCompletionUsage(completion, meta) {
        const u = completion.usage;
        if (!u)
            return;
        const est = (0, openaiCost_1.estimateOpenAiCallCostUsd)(completion.model || this.config.gptModel, u.prompt_tokens ?? 0, u.completion_tokens ?? 0);
        console.log('OpenAI chat usage', {
            ...meta,
            model: completion.model || this.config.gptModel,
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
            estimatedCostUsd: Number(est.toFixed(6))
        });
    }
    async repairAnalysisJson(rawText, requestId, sessionId) {
        const system = `You are a strict JSON repair tool.\n\n` +
            `Given a model output that SHOULD be a single JSON object for an interview analysis, return ONLY a corrected JSON object that:\n` +
            `- is valid JSON\n` +
            `- matches the required analysis schema (analysisVersion: 2; feedback; scores; insights; topTraits; strengthAreas; strengthInsights; opportunityAreas; opportunityInsights; aiAttributes non-empty; participants; messages)\n` +
            `- contains no extra text outside JSON\n\n` +
            `If fields are missing, fill them with best-effort defaults that satisfy minimum lengths and types.\n` +
            `Do not include markdown.`;
        const user = `REQUEST_ID: ${requestId}\nSESSION_ID: ${sessionId ?? ''}\n\nRAW_OUTPUT:\n${rawText}`;
        const maxTokens = computeSafeMaxCompletionTokens({
            model: this.config.gptModel,
            systemText: system,
            userText: user,
            desiredMax: 2000,
            margin: 256,
            minFloor: 512,
            contextLimitOverride: this.config.contextTokenLimit
        });
        const completion = await this.gptClient.chat.completions.create({
            model: this.config.gptModel,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ],
            temperature: 0,
            max_tokens: maxTokens
        });
        this.logChatCompletionUsage(completion, {
            requestId,
            phase: 'json_repair',
            sessionId
        });
        const text = completion.choices[0]?.message?.content?.trim();
        if (!text) {
            throw new OpenAIServiceError('Empty JSON repair response from GPT API');
        }
        return text;
    }
    async analyzeConversationSinglePass(transcript, userContext, requestId, analysisTier, sessionId) {
        this.validateTextInput(transcript, 'Transcript', this.config.analysisTierSMaxInputTokens + 12000);
        const systemContent = exports.INTERVIEW_ANALYSIS_SYSTEM_PROMPT.replace('{{TRANSCRIPT}}', () => transcript);
        const prompt = this.generateConversationAnalysisPrompt(transcript, userContext);
        const analysisMaxTokens = computeSafeMaxCompletionTokens({
            model: this.config.gptModel,
            systemText: systemContent,
            userText: prompt,
            desiredMax: exports.ANALYSIS_DESIRED_MAX_COMPLETION,
            margin: 256,
            minFloor: 1024,
            contextLimitOverride: this.config.contextTokenLimit
        });
        const completion = await this.gptClient.chat.completions.create({
            model: this.config.gptModel,
            messages: [
                {
                    role: 'system',
                    content: systemContent
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: analysisMaxTokens
        });
        this.logChatCompletionUsage(completion, {
            requestId,
            analysisTier,
            phase: 'single_pass',
            sessionId
        });
        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new OpenAIServiceError('Empty response from GPT API');
        }
        try {
            return this.parseAnalysisResponse(responseText, userContext);
        }
        catch (e) {
            const repaired = await this.repairAnalysisJson(responseText, requestId, sessionId);
            return this.parseAnalysisResponse(repaired, userContext);
        }
    }
    splitTranscriptForMapReduce(transcript) {
        const maxTok = OpenAIService.MAP_SEGMENT_TOKEN_BUDGET;
        const model = this.config.gptModel;
        const parts = transcript.split(/\n\n+/);
        const segments = [];
        let buf = [];
        let tok = 0;
        const flush = () => {
            if (buf.length) {
                segments.push(buf.join('\n\n'));
                buf = [];
                tok = 0;
            }
        };
        for (const p of parts) {
            const pt = (0, analysisTokens_1.estimateTokenCountForText)(p, model);
            if (pt > maxTok) {
                flush();
                let start = 0;
                while (start < p.length) {
                    let lo = start + 1;
                    let hi = p.length;
                    let best = start + 1;
                    while (lo <= hi) {
                        const mid = Math.floor((lo + hi) / 2);
                        const slice = p.slice(start, mid);
                        const t = (0, analysisTokens_1.estimateTokenCountForText)(slice, model);
                        if (t <= maxTok) {
                            best = mid;
                            lo = mid + 1;
                        }
                        else {
                            hi = mid - 1;
                        }
                    }
                    if (best <= start)
                        best = start + 1;
                    segments.push(p.slice(start, best));
                    start = best;
                }
                continue;
            }
            if (tok + pt > maxTok && buf.length) {
                flush();
            }
            buf.push(p);
            tok += pt;
        }
        flush();
        if (segments.length === 0 && transcript.trim()) {
            return [transcript.trim()];
        }
        return segments.slice(0, OpenAIService.MAX_MAP_SEGMENTS);
    }
    async mapTranscriptSegment(segment, index, total, requestId, sessionId) {
        const user = `SEGMENT ${index + 1} of ${total}:\n---\n${segment}\n---`;
        const mapMax = computeSafeMaxCompletionTokens({
            model: this.config.gptModel,
            systemText: OpenAIService.MAP_SEGMENT_SYSTEM,
            userText: user,
            desiredMax: 1200,
            margin: 128,
            minFloor: 128,
            contextLimitOverride: this.config.contextTokenLimit
        });
        const completion = await this.gptClient.chat.completions.create({
            model: this.config.gptModel,
            messages: [
                { role: 'system', content: OpenAIService.MAP_SEGMENT_SYSTEM },
                { role: 'user', content: user }
            ],
            temperature: 0.2,
            max_tokens: mapMax
        });
        this.logChatCompletionUsage(completion, {
            requestId,
            analysisTier: 'L',
            phase: `map_segment_${index + 1}_of_${total}`,
            sessionId
        });
        const text = completion.choices[0]?.message?.content?.trim();
        if (!text) {
            throw new OpenAIServiceError('Empty map segment response from GPT API');
        }
        return text;
    }
    buildReduceSystemPrompt() {
        return `You are merging segment-level transcript MESSAGE JSON into ONE full interview analysis JSON.
The transcript was long and processed in parts; your job is to produce a single coherent analysisVersion 2 object.

Output ONLY valid JSON matching the same contract as a full interview analysis:
- analysisVersion: 2
- feedback, scores (1-5 integers): clarity, confidence, tone, enthusiasm, specificity
- insights (at least 1 non-empty string), topTraits (at least 2), strengthAreas, strengthInsights, opportunityAreas, opportunityInsights (each at least 1 non-empty)
- aiAttributes: non-empty object
- participants: candidate + interviewers array
- messages: non-empty array of:
  { id, role, speakerId, text, edited: { isEdited, editedText? }, feedback?: { flag } for candidate lines }

You will receive multiple JSON blobs each containing messages extracted from a transcript segment.
Merge them in order into ONE "messages" list and assign stable ids (m1, m2, ...).
Do NOT include any placeholder text.
No markdown outside JSON.`;
    }
    async analyzeConversationMapReduce(transcript, userContext, requestId, sessionId) {
        const segments = this.splitTranscriptForMapReduce(transcript);
        const mapOutputs = [];
        for (let i = 0; i < segments.length; i++) {
            mapOutputs.push(await this.mapTranscriptSegment(segments[i], i, segments.length, requestId, sessionId));
        }
        const segmentBundle = mapOutputs.map((o, idx) => `=== SEGMENT ${idx + 1} JSON ===\n${o}`).join('\n\n');
        const userCtxBlock = this.generateConversationAnalysisPrompt(transcript, userContext);
        const reduceUser = `SEGMENT_JSON_MESSAGES:\n${segmentBundle}\n\nUSER_CONTEXT:\n${userCtxBlock}`;
        const reduceSystem = this.buildReduceSystemPrompt();
        const reduceMax = computeSafeMaxCompletionTokens({
            model: this.config.gptModel,
            systemText: reduceSystem,
            userText: reduceUser,
            desiredMax: exports.ANALYSIS_DESIRED_MAX_COMPLETION,
            margin: 256,
            minFloor: 1024,
            contextLimitOverride: this.config.contextTokenLimit
        });
        const completion = await this.gptClient.chat.completions.create({
            model: this.config.gptModel,
            messages: [
                { role: 'system', content: reduceSystem },
                { role: 'user', content: reduceUser }
            ],
            temperature: 0.25,
            max_tokens: reduceMax
        });
        this.logChatCompletionUsage(completion, {
            requestId,
            analysisTier: 'L',
            phase: 'reduce',
            sessionId
        });
        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new OpenAIServiceError('Empty reduce response from GPT API');
        }
        try {
            return this.parseAnalysisResponse(responseText, userContext);
        }
        catch (e) {
            const repaired = await this.repairAnalysisJson(responseText, requestId, sessionId);
            return this.parseAnalysisResponse(repaired, userContext);
        }
    }
    generatePersonalizedPrompt(userProfile) {
        const { targetIndustry, targetJobTitle, aiAttributes, extractedSkills } = userProfile;
        let prompt = 'Here\'s a personalized interview question for you:\n\n';
        if (targetIndustry && targetJobTitle) {
            prompt += `As someone targeting a ${targetJobTitle} role in ${targetIndustry}, `;
        }
        if (extractedSkills && extractedSkills.length > 0) {
            prompt += `with skills in ${extractedSkills.slice(0, 3).join(', ')}, `;
        }
        const attributes = aiAttributes || {};
        if (attributes.communicationStyle === 'detailed') {
            prompt += 'provide a comprehensive answer that demonstrates your analytical thinking. ';
        }
        else if (attributes.communicationStyle === 'concise') {
            prompt += 'give a clear and concise response that highlights your key points. ';
        }
        prompt += 'Tell me about a challenging project you worked on and how you overcame obstacles.';
        return prompt;
    }
    generateConversationAnalysisPrompt(_transcript, userContext) {
        const { profile } = userContext;
        const targetRole = userContext.targetRole || {
            industry: profile.targetIndustry || 'Technology',
            jobTitle: profile.targetJobTitle || 'Software Engineer'
        };
        const pastSessionsBlock = userContext.pastSessionsSummary
            ? `

PAST SESSIONS (for context on this candidate's progress and recurring themes):
${userContext.pastSessionsSummary}

Use this context to note trends, recurring strengths or improvement areas, and progress over time where relevant.
`
            : '';
        return `USER CONTEXT (the interview transcript is in your system message under INPUT TRANSCRIPT):
- Target Role: ${targetRole.jobTitle} in ${targetRole.industry}
- Skills: ${profile.extractedSkills?.join(', ') || 'Not specified'}
- Experience Level: ${profile.experienceLevel || 'Not specified'}
${pastSessionsBlock}

Follow the JSON output contract from your system instructions. Coaching text (feedback, insights, strength/opportunity strings) should address the candidate in second person ("you/your") where natural.`;
    }
    extractJson(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            return null;
        return JSON.parse(jsonMatch[0]);
    }
    generateResumeExtractionPrompt(resumeText) {
        return `
Extract structured information from this resume text:

RESUME TEXT: "${resumeText}"

Please provide the extracted information in this exact JSON format:
{
  "fullName": "Full name of the candidate",
  "currentJobTitle": "Current or most recent job title",
  "currentCompany": "Current or most recent company",
  "school": "Most recent or highest level educational institution",
  "degreeInfo": "Degree information (e.g., Bachelor of Science in Computer Science)",
  "previousJobTitles": ["Previous job title 1", "Previous job title 2"],
  "skills": ["skill1", "skill2", "skill3"],
  "experienceLevel": "Entry|Mid|Senior|Executive",
  "industries": ["industry1", "industry2"],
  "jobTitles": ["title1", "title2"],
  "summary": "Brief professional summary"
}

Focus on extracting:
- Full name from the top of the resume
- Current job title and company
- Educational background (school and degree)
- Previous job titles (optional, if available)
- Technical skills and relevant experience
- Career progression and experience level
`;
    }
    parseAnalysisResponse(responseText, _userContext) {
        try {
            const parsed = this.extractJson(responseText);
            if (!parsed)
                throw new Error('No JSON found in response');
            const trimStrings = (arr) => Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(s => s.length > 0) : [];
            const feedbackText = typeof parsed.feedback === 'string'
                ? parsed.feedback.trim()
                : typeof parsed.analysis?.summaryFeedback === 'string'
                    ? String(parsed.analysis.summaryFeedback).trim()
                    : '';
            const scoreSource = parsed.scores ?? parsed.analysis?.scores ?? {};
            if (!feedbackText || !scoreSource || typeof scoreSource !== 'object') {
                throw new Error('Missing required fields in analysis response');
            }
            const clampScore = (n) => {
                const num = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
                return Math.max(1, Math.min(5, Math.round(num)));
            };
            const scores = {
                clarity: clampScore(scoreSource.clarity),
                confidence: clampScore(scoreSource.confidence),
                tone: clampScore(scoreSource.tone),
                enthusiasm: clampScore(scoreSource.enthusiasm),
                specificity: clampScore(scoreSource.specificity)
            };
            let insights = trimStrings(parsed.insights);
            if (insights.length === 0 && (Array.isArray(parsed.analysis?.strengths) || Array.isArray(parsed.analysis?.opportunities))) {
                insights = [
                    ...trimStrings(parsed.analysis?.strengths),
                    ...trimStrings(parsed.analysis?.opportunities)
                ].slice(0, 8);
            }
            let strengthAreas = trimStrings(parsed.strengthAreas);
            if (strengthAreas.length === 0) {
                strengthAreas = trimStrings(parsed.aiAttributes?.strengthAreas);
            }
            const strengthInsights = trimStrings(parsed.strengthInsights);
            let opportunityAreas = trimStrings(parsed.opportunityAreas);
            if (opportunityAreas.length === 0) {
                opportunityAreas = trimStrings(parsed.aiAttributes?.improvementAreas);
            }
            const opportunityInsights = trimStrings(parsed.opportunityInsights);
            const topTraits = trimStrings(parsed.topTraits);
            const aiAttributes = {
                ...(parsed.aiAttributes && typeof parsed.aiAttributes === 'object' ? parsed.aiAttributes : {})
            };
            delete aiAttributes.strengthAreas;
            delete aiAttributes.improvementAreas;
            const participants = parsed.participants && typeof parsed.participants === 'object'
                ? {
                    candidate: {
                        id: String(parsed.participants.candidate?.id ?? 'candidate'),
                        ...(parsed.participants.candidate?.displayName
                            ? { displayName: String(parsed.participants.candidate.displayName) }
                            : {})
                    },
                    interviewers: Array.isArray(parsed.participants.interviewers)
                        ? parsed.participants.interviewers.map((i, idx) => ({
                            id: String(i?.id ?? `interviewer_${idx + 1}`),
                            ...(i?.displayName ? { displayName: String(i.displayName) } : {})
                        }))
                        : (0, interviewConversation_1.buildDefaultParticipants)().interviewers
                }
                : (0, interviewConversation_1.buildDefaultParticipants)();
            const rawMessages = Array.isArray(parsed.messages) ? parsed.messages : [];
            const messages = [];
            for (const m of rawMessages) {
                if (!m || typeof m !== 'object')
                    continue;
                const id = String(m.id ?? '').trim();
                const text = String(m.text ?? '').trim();
                if (!id || !text)
                    continue;
                const role = ['interviewer', 'candidate', 'other', 'unknown'].includes(String(m.role))
                    ? m.role
                    : 'unknown';
                const speakerId = String(m.speakerId ?? '').trim() || 'unknown';
                const ed = m.edited;
                const edited = ed && typeof ed === 'object'
                    ? {
                        isEdited: Boolean(ed.isEdited),
                        editedText: typeof ed.editedText === 'string' ? ed.editedText : ''
                    }
                    : { isEdited: false, editedText: '' };
                const flag = (0, interviewConversation_2.normalizeCandidateFlag)(m.feedback?.flag) ??
                    (0, interviewConversation_2.normalizeCandidateFlag)(m.candidateFeedback?.flag);
                const row = {
                    id,
                    role,
                    speakerId,
                    text,
                    edited,
                    ...(typeof m.startMs === 'number' ? { startMs: m.startMs } : {}),
                    ...(typeof m.endMs === 'number' ? { endMs: m.endMs } : {})
                };
                if (role === 'candidate' && flag) {
                    row.feedback = { flag };
                }
                messages.push(row);
            }
            const analysisVersion = typeof parsed.analysisVersion === 'number' && Number.isFinite(parsed.analysisVersion)
                ? parsed.analysisVersion
                : 2;
            const analysis = {
                analysisVersion,
                feedback: feedbackText,
                scores,
                insights,
                topTraits,
                strengthAreas,
                strengthInsights,
                opportunityAreas,
                opportunityInsights,
                participants,
                messages
            };
            (0, sessionAiAnalysis_1.assertAnalysisTraitContract)({
                insights,
                topTraits,
                strengthAreas,
                strengthInsights,
                opportunityAreas,
                opportunityInsights,
                profileAiAttributes: aiAttributes,
                messages
            });
            return { analysis, profileAiAttributes: aiAttributes };
        }
        catch (error) {
            throw new OpenAIServiceError('Failed to parse analysis response', error);
        }
    }
    parseResumeData(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                fullName: parsed.fullName || undefined,
                currentJobTitle: parsed.currentJobTitle || undefined,
                currentCompany: parsed.currentCompany || undefined,
                school: parsed.school || undefined,
                degreeInfo: parsed.degreeInfo || undefined,
                previousJobTitles: Array.isArray(parsed.previousJobTitles) ? parsed.previousJobTitles : undefined,
                skills: Array.isArray(parsed.skills) ? parsed.skills : [],
                experienceLevel: parsed.experienceLevel || 'Mid',
                industries: Array.isArray(parsed.industries) ? parsed.industries : [],
                jobTitles: Array.isArray(parsed.jobTitles) ? parsed.jobTitles : [],
                summary: parsed.summary || ''
            };
        }
        catch (error) {
            throw new OpenAIServiceError('Failed to parse resume data', error);
        }
    }
    generateFallbackAnalysis(transcript, _userContext) {
        const wordCount = transcript.split(/\s+/).filter(Boolean).length;
        const hasSpecificExamples = /example|instance|case|situation|time when/i.test(transcript);
        const hasNumbers = /\d+/.test(transcript);
        const hasConfidentLanguage = /confident|sure|definitely|absolutely/i.test(transcript);
        const baseScore = Math.min(5, Math.max(1, Math.floor(wordCount / 50) + 2));
        const clamp = (n) => Math.max(1, Math.min(5, Math.round(n)));
        const feedback = `Based on basic analysis: Your response was ${wordCount} words long. ${hasSpecificExamples ? 'Good use of specific examples. ' : 'Consider adding more specific examples. '}${hasNumbers ? 'Nice inclusion of quantifiable details. ' : 'Try to include more quantifiable details. '}Note: This is a simplified analysis due to temporary service limitations.`;
        const excerpt = transcript.trim().length > 12000 ? `${transcript.trim().slice(0, 12000)}\n…` : transcript.trim();
        const participants = (0, interviewConversation_1.buildDefaultParticipants)();
        const analysis = {
            analysisVersion: 2,
            feedback,
            scores: {
                clarity: clamp(baseScore + (hasSpecificExamples ? 1 : -1)),
                confidence: clamp(baseScore + (hasConfidentLanguage ? 1 : -1)),
                tone: clamp(baseScore),
                enthusiasm: clamp(baseScore + (transcript.includes('!') ? 1 : -1)),
                specificity: clamp(baseScore + (hasNumbers ? 1 : -1))
            },
            insights: [
                hasSpecificExamples ? 'You used concrete examples well' : 'Add more specific examples to strengthen your response',
                wordCount > 100 ? 'Your response length was good' : 'Consider providing more detailed responses',
                'Full AI analysis will be available when service is restored'
            ],
            strengthAreas: hasSpecificExamples ? ['examples', 'content'] : ['clarity', 'brevity'],
            strengthInsights: [
                hasSpecificExamples
                    ? 'You used concrete examples to support your points'
                    : 'You kept your response concise and focused',
                wordCount > 50 ? 'You provided substantive content' : 'You delivered a clear, direct answer'
            ],
            opportunityAreas: ['structure', 'depth'],
            opportunityInsights: [
                hasSpecificExamples
                    ? 'Consider adding more concrete metrics or outcomes to demonstrate your impact'
                    : 'Consider adding more specific examples or metrics to strengthen your response',
                'Full AI analysis will be available when AI analysis is restored'
            ],
            topTraits: [
                hasSpecificExamples ? 'You use concrete examples to support your points' : 'You communicate in a direct, clear way',
                wordCount > 50 ? 'You demonstrate ability to elaborate on experience' : 'You stay focused on the question at hand'
            ],
            participants,
            messages: [
                {
                    id: 'm1',
                    role: 'interviewer',
                    speakerId: 'interviewer_1',
                    text: 'Interview recording (aggregate transcript analyzed).',
                    edited: { isEdited: false, editedText: '' }
                },
                {
                    id: 'm2',
                    role: 'candidate',
                    speakerId: 'candidate',
                    text: excerpt || '(empty transcript)',
                    edited: { isEdited: false, editedText: '' },
                    feedback: { flag: 'Neutral' }
                }
            ]
        };
        return {
            analysis,
            profileAiAttributes: {
                communicationStyle: wordCount > 150 ? 'detailed' : 'concise'
            }
        };
    }
    generateFallbackResumeData(resumeText) {
        const text = resumeText.toLowerCase();
        const techSkills = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'aws', 'docker']
            .filter(skill => text.includes(skill));
        const softSkills = ['leadership', 'communication', 'teamwork', 'management', 'analysis']
            .filter(skill => text.includes(skill));
        const skills = [...techSkills, ...softSkills];
        let experienceLevel = 'Mid';
        if (text.includes('senior') || text.includes('lead') || text.includes('manager')) {
            experienceLevel = 'Senior';
        }
        else if (text.includes('junior') || text.includes('intern') || text.includes('entry')) {
            experienceLevel = 'Entry';
        }
        return {
            skills,
            experienceLevel,
            industries: [],
            jobTitles: [],
            summary: 'Resume processed with basic extraction due to temporary service limitations. Full AI analysis will be available when service is restored.'
        };
    }
}
exports.OpenAIService = OpenAIService;
OpenAIService.MAP_SEGMENT_TOKEN_BUDGET = 3200;
OpenAIService.MAX_MAP_SEGMENTS = 25;
OpenAIService.MAP_SEGMENT_SYSTEM = `You extract message-level structure from ONE segment of an interview transcript (speech-to-text).

Output ONLY valid JSON (no markdown) with this shape:
{
  "participantsGuess": {
    "candidate": { "id": "candidate" },
    "interviewers": [{ "id": "interviewer_1" }]
  },
  "messages": [
    { "role": "interviewer|candidate|other|unknown", "speakerId": "interviewer_1|candidate|other|unknown", "text": "..." }
  ]
}

Rules:
- Keep text verbatim (light cleanup only).
- Prefer alternating interviewer/candidate turns when obvious.
- If unsure, use role="unknown" and speakerId="unknown".
- messages must be non-empty.`;
//# sourceMappingURL=OpenAIService.js.map