import { prisma } from "@/config/database";
import { UserService } from "./user.service";
import { emailSyncQueue } from "@/config/queue";
import { EmailSyncJob } from "@crate/shared";
import { BatchSyncWorker } from "@/workers/batch-sync.worker";
import { BATCH_CONFIG, SyncStrategy } from "@/config/batch";
import { RETRY_CONFIGS, withRetry } from "@/utils/retry";

export class EmailSyncService {
  static async initiateSync(userId: string, strategy: SyncStrategy = "quick") {
    const user = await withRetry(
      () => UserService.findById(userId),
      RETRY_CONFIGS.database
    );

    if (!user?.accessToken) {
      throw new Error("User access token not found");
    }

    const syncState = await this.getSyncState(userId);

    if (await this.handleSyncTimeout(userId, syncState)) {
      const refreshedState = await this.getSyncState(userId);
      Object.assign(syncState, refreshedState);
    }

    if (syncState.syncInProgress) {
      throw new Error("Sync already in progress for this user");
    }

    await this.updateSyncState(userId, {
      syncInProgress: true,
      nextPageToken: strategy === "full" ? null : syncState.nextPageToken,
    });

    const config = BATCH_CONFIG.SYNC_CONFIGS[strategy];

    try {
      await withRetry(
        () =>
          emailSyncQueue.add(
            "sync-user-emails",
            {
              userId,
              maxResults: config.batchSize,
              strategy,
              pageToken: strategy === "full" ? null : syncState.nextPageToken,
              isInitialSync: syncState.isInitialSyncing,
            } as EmailSyncJob,
            {
              priority: config.priority,
              delay: config.delay,
              jobId: `sync-${userId}-${strategy}-${Date.now()}`,
              removeOnComplete: 10,
              removeOnFail: 5,
              timeout: BATCH_CONFIG.JOB_TIMEOUT_MS,
            }
          ),
        RETRY_CONFIGS.queue
      );

      console.log(`✅ ${strategy} sync initiated for user ${userId}`);

      return {
        message: `${strategy} sync initiated with batch processing`,
        strategy,
        estimatedBatchSize: config.batchSize,
      };
    } catch (error) {
      await this.updateSyncState(userId, { syncInProgress: false });
      throw error;
    }
  }

  static async processEmailSync(job: any) {
    return withRetry(
      () => BatchSyncWorker.processEmailSync(job),
      RETRY_CONFIGS.api
    );
  }

  static async resetSyncState(userId: string) {
    await this.updateSyncState(userId, {
      syncInProgress: false,
      isInitialSyncing: false,
      nextPageToken: null,
    });

    console.log(`✅ Reset sync state for user ${userId}`);
    return { message: "Sync state reset successfully" };
  }

  static async cleanupStuckSyncs() {
    const cutoffTime = new Date(Date.now() - BATCH_CONFIG.SYNC_TIMEOUT_MS);

    return withRetry(async () => {
      const stuckSyncs = await prisma.syncState.findMany({
        where: {
          syncInProgress: true,
          updatedAt: { lt: cutoffTime },
        },
      });

      if (stuckSyncs.length > 0) {
        console.log(`Found ${stuckSyncs.length} stuck syncs, resetting...`);

        await prisma.syncState.updateMany({
          where: {
            id: { in: stuckSyncs.map((s) => s.id) },
          },
          data: {
            syncInProgress: false,
            isInitialSyncing: false,
          },
        });

        console.log(`✅ Reset ${stuckSyncs.length} stuck syncs`);
      }

      return { resetCount: stuckSyncs.length };
    }, RETRY_CONFIGS.database);
  }

  static async cleanupOldJobs() {
    await withRetry(async () => {
      await emailSyncQueue.clean(0, "completed");
      await emailSyncQueue.clean(0, "failed");
      console.log("✅ Cleaned up old sync jobs");
    }, RETRY_CONFIGS.queue);
  }

  static async getSyncStats(userId: string) {
    return withRetry(async () => {
      const [syncState, totalEmails, recentEmails] = await Promise.all([
        prisma.syncState.findUnique({ where: { userId } }),
        prisma.email.count({ where: { userId } }),
        prisma.email.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return {
        syncInProgress: syncState?.syncInProgress || false,
        isInitialSyncing: syncState?.isInitialSyncing || false,
        lastSyncAt: syncState?.lastSyncAt,
        totalEmails,
        recentEmails,
      };
    }, RETRY_CONFIGS.database);
  }

  private static async handleSyncTimeout(
    userId: string,
    syncState: any
  ): Promise<boolean> {
    const now = new Date();
    const lastUpdate = syncState.updatedAt || syncState.createdAt;
    const timeSinceLastUpdate = now.getTime() - lastUpdate.getTime();

    if (
      syncState.syncInProgress &&
      timeSinceLastUpdate > BATCH_CONFIG.SYNC_TIMEOUT_MS
    ) {
      console.warn(
        `Sync timeout detected for user ${userId}, resetting sync state`
      );
      await this.updateSyncState(userId, {
        syncInProgress: false,
        isInitialSyncing: false,
      });
      return true;
    }

    return false;
  }

  private static async getSyncState(userId: string) {
    return withRetry(
      () =>
        prisma.syncState.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            isInitialSyncing: true,
            syncInProgress: false,
          },
        }),
      RETRY_CONFIGS.database
    );
  }

  private static async updateSyncState(userId: string, data: any) {
    return withRetry(
      () =>
        prisma.syncState.upsert({
          where: { userId },
          update: {
            ...data,
            updatedAt: new Date(),
          },
          create: {
            userId,
            isInitialSyncing: true,
            syncInProgress: false,
            ...data,
            updatedAt: new Date(),
          },
        }),
      RETRY_CONFIGS.database
    );
  }
}
