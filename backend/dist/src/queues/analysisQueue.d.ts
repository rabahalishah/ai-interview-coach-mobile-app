import { Queue } from 'bullmq';
import IORedis from 'ioredis';
export declare const ANALYSIS_QUEUE_NAME = "session-ai-analysis";
export declare function isAsyncAnalysisEnabled(): boolean;
export declare function getQueueRedisConnection(): IORedis;
export declare function getAnalysisQueue(): Queue;
export declare function enqueueSessionAnalysisJob(sessionId: string): Promise<void>;
//# sourceMappingURL=analysisQueue.d.ts.map