import { emailProcessingQueue } from '@/config/queue';
import { EmailProcessingService } from '@/services/email-processing.service';
import { EmailProcessingJob } from '@crate/shared';

const BATCH_SIZE = 10;
const BATCH_INTERVAL = 100; // ms
let batch: EmailProcessingJob[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

async function flushBatch() {
  if (batch.length === 0) return;
  const jobsToProcess = batch.splice(0, BATCH_SIZE);
  if (jobsToProcess.length === 1) {
    await EmailProcessingService.processEmail(jobsToProcess[0]);
  } else {
    await EmailProcessingService.processEmailBatch(jobsToProcess);
  }
}

emailProcessingQueue.process('process-email', BATCH_SIZE, async (job) => {
  const jobData = job.data as EmailProcessingJob;
  batch.push(jobData);
  if (batch.length >= BATCH_SIZE) {
    if (batchTimeout) clearTimeout(batchTimeout);
    await flushBatch();
  } else if (!batchTimeout) {
    batchTimeout = setTimeout(async () => {
      await flushBatch();
      batchTimeout = null;
    }, BATCH_INTERVAL);
  }
  return { enqueued: true };
});

emailProcessingQueue.on('completed', (job, result) => {
  console.log(`Email processing job ${job.id} completed:`, result);
});

emailProcessingQueue.on('failed', (job, err) => {
  console.error(`Email processing job ${job.id} failed:`, err);
});

console.log('✅ Email processing worker is ready and listening for jobs');
console.log('📊 Worker will process up to 10 concurrent jobs in batch mode');