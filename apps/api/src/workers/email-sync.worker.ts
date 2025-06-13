import { emailSyncQueue } from '@/config/queue';
import { EmailSyncService } from '@/services/email-sync.service';
import { EmailSyncJob } from '@crate/shared';

emailSyncQueue.process('sync-user-emails', 5, async (job) => {
  const jobData = job.data as EmailSyncJob;
  
  job.progress(0);
  
  try {
    const result = await EmailSyncService.processEmailSync(jobData);
    
    job.progress(100);
    
    return result;
  } catch (error) {
    console.error('Email sync job failed:', error);
    throw error;
  }
});

emailSyncQueue.on('completed', (job, result) => {
  console.log(`Email sync job ${job.id} completed:`, result);
});

emailSyncQueue.on('failed', (job, err) => {
  console.error(`Email sync job ${job.id} failed:`, err);
});