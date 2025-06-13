import { emailProcessingQueue } from '@/config/queue';
import { EmailProcessingService } from '@/services/email-processing.service';
import { EmailProcessingJob } from '@crate/shared';

emailProcessingQueue.process('process-email', 10, async (job) => {
  const jobData = job.data as EmailProcessingJob;
  
  job.progress(0);
  
  try {
    const result = await EmailProcessingService.processEmail(jobData);
    
    job.progress(100);
    
    return result;
  } catch (error) {
    console.error('Email processing job failed:', error);
    throw error;
  }
});

emailProcessingQueue.on('completed', (job, result) => {
  console.log(`Email processing job ${job.id} completed:`, result);
});

emailProcessingQueue.on('failed', (job, err) => {
  console.error(`Email processing job ${job.id} failed:`, err);
});