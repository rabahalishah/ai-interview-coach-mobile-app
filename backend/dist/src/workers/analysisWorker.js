"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAnalysisWorker = startAnalysisWorker;
const bullmq_1 = require("bullmq");
const analysisQueue_1 = require("../queues/analysisQueue");
function startAnalysisWorker(services) {
    if (!(0, analysisQueue_1.isAsyncAnalysisEnabled)()) {
        return null;
    }
    const worker = new bullmq_1.Worker(analysisQueue_1.ANALYSIS_QUEUE_NAME, async (job) => {
        console.log('Analysis worker job started', { jobId: job.id, sessionId: job.data.sessionId });
        await services.audioSessionService.runAnalysisJob(job.data.sessionId);
        console.log('Analysis worker job completed', { jobId: job.id, sessionId: job.data.sessionId });
    }, {
        connection: (0, analysisQueue_1.getQueueRedisConnection)(),
        concurrency: 2
    });
    worker.on('completed', (job) => {
        console.log('Analysis worker job event completed', { jobId: job.id, sessionId: job.data?.sessionId });
    });
    worker.on('failed', (job, err) => {
        console.error('Analysis worker job failed', { jobId: job?.id, err: err?.message });
    });
    console.log('✅ Session analysis worker started (BullMQ)');
    return worker;
}
//# sourceMappingURL=analysisWorker.js.map