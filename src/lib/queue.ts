import Bull from "bull";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const defaultOptions: Bull.QueueOptions = {
  redis: REDIS_URL,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
};

export const crawlQueue = new Bull("poddigest:crawl", defaultOptions);
export const transcribeQueue = new Bull("poddigest:transcribe", defaultOptions);
export const analyzeQueue = new Bull("poddigest:analyze", defaultOptions);
export const narrateQueue = new Bull("poddigest:narrate", defaultOptions);
export const assembleQueue = new Bull("poddigest:assemble", defaultOptions);
export const deliverQueue = new Bull("poddigest:deliver", defaultOptions);
export const pipelineQueue = new Bull("poddigest:pipeline", defaultOptions);

export const allQueues = [
  crawlQueue,
  transcribeQueue,
  analyzeQueue,
  narrateQueue,
  assembleQueue,
  deliverQueue,
  pipelineQueue,
];

export async function closeAllQueues() {
  await Promise.all(allQueues.map((q) => q.close()));
}
