import { emailSyncQueue } from '@/config/queue';
import { EmailSyncService } from '@/services/email-sync.service';
import { EmailSyncJob } from '@crate/shared';

console.log('🚀 Email sync worker starting...');
console.log('📧 Queue configured, waiting for jobs...');

emailSyncQueue.process('sync-user-emails', 5, async (job) => {
  console.log(`📨 Processing email sync job ${job.id}...`);
  const jobData = job.data as EmailSyncJob;
  
  job.progress(0);
  
  try {
    const result = await EmailSyncService.processEmailSync(jobData);
    
    job.progress(100);
    console.log(`✅ Email sync job ${job.id} completed successfully`);
    
    return result;
  } catch (error) {
    console.error(`❌ Email sync job ${job.id} failed:`, error);
    throw error;
  }
});

emailSyncQueue.on('completed', (job, result) => {
  console.log(`🎉 Email sync job ${job.id} completed:`, result);
});

emailSyncQueue.on('failed', (job, err) => {
  console.error(`💥 Email sync job ${job.id} failed:`, err);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down email sync worker...');
  await emailSyncQueue.close();
  process.exit(0);
});

console.log('✅ Email sync worker is ready and listening for jobs');
console.log('📊 Worker will process up to 5 concurrent jobs');
console.log('🔄 Press Ctrl+C to stop the worker');