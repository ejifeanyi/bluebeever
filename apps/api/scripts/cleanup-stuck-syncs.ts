import { EmailSyncService } from '../src/services/email-sync.service';
import { prisma } from '../src/config/database';

async function main() {
  console.log('🧹 Starting cleanup of stuck syncs...');
  
  try {
    const result = await EmailSyncService.cleanupStuckSyncs();
    console.log(`✅ Cleanup completed: ${result.resetCount} stuck syncs reset`);
    
    await EmailSyncService.cleanupOldJobs();
    
    const syncStates = await prisma.syncState.findMany({
      where: { syncInProgress: true },
      select: {
        userId: true,
        syncInProgress: true,
        isInitialSyncing: true,
        lastSyncAt: true,
        updatedAt: true
      }
    });
    
    if (syncStates.length > 0) {
      console.log('\n📊 Active syncs:');
      syncStates.forEach(state => {
        console.log(`  User: ${state.userId}, Last updated: ${state.updatedAt}`);
      });
    } else {
      console.log('\n✅ No active syncs found');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}