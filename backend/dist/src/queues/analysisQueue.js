"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYSIS_QUEUE_NAME = void 0;
exports.isAsyncAnalysisEnabled = isAsyncAnalysisEnabled;
exports.getQueueRedisConnection = getQueueRedisConnection;
exports.getAnalysisQueue = getAnalysisQueue;
exports.enqueueSessionAnalysisJob = enqueueSessionAnalysisJob;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../utils/config");
exports.ANALYSIS_QUEUE_NAME = 'session-ai-analysis';
let sharedConnection = null;
let analysisQueue = null;
function isAsyncAnalysisEnabled() {
    return Boolean(config_1.config.REDIS_URL?.trim());
}
function getQueueRedisConnection() {
    const url = config_1.config.REDIS_URL?.trim();
    if (!url) {
        throw new Error('REDIS_URL is required for the analysis queue');
    }
    if (!sharedConnection) {
        sharedConnection = new ioredis_1.default(url, { maxRetriesPerRequest: null });
    }
    return sharedConnection;
}
function getAnalysisQueue() {
    if (!isAsyncAnalysisEnabled()) {
        throw new Error('Analysis queue is disabled (set REDIS_URL to enable)');
    }
    if (!analysisQueue) {
        analysisQueue = new bullmq_1.Queue(exports.ANALYSIS_QUEUE_NAME, {
            connection: getQueueRedisConnection(),
            defaultJobOptions: {
                removeOnComplete: { count: 200 },
                removeOnFail: { count: 100 },
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 }
            }
        });
    }
    return analysisQueue;
}
async function enqueueSessionAnalysisJob(sessionId) {
    if (!isAsyncAnalysisEnabled()) {
        return;
    }
    const queue = getAnalysisQueue();
    await queue.add('analyze', { sessionId }, { jobId: `analysis-${sessionId}` });
}
//# sourceMappingURL=analysisQueue.js.map