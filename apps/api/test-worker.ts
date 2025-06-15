import { emailSyncQueue } from '@/config/queue';

// Add a test job to the queue
async function testWorker() {
  console.log('🧪 Adding test job to email sync queue...');
  
  const testJob = await emailSyncQueue.add('sync-user-emails', {
    userId: 'cmbusq05h0000iphaoekpc0rb',
    operation: 'test-sync'
  });

  console.log(`📨 Test job added with ID: ${testJob.id}`);
  console.log('👀 Check your worker terminal to see if it processes this job');
}

testWorker().catch(console.error);