import { Job } from "bull";
import { EmailSyncJob } from "@crate/shared";
import { UserService } from "@/services/user.service";
import { AuthService } from "@/services/auth.service";
import { EmailBatchProcessor } from "@/services/email-batch-processor.service";
import { getGmailClient } from "@/config/google";
import { emailSyncQueue } from "@/config/queue";
import { prisma } from "@/config/database";
import { BATCH_CONFIG } from "@/config/batch";

export class BatchSyncWorker {
  static async processEmailSync(job: Job<EmailSyncJob>) {
    const {
      userId,
      maxResults = 100,
      pageToken,
      isInitialSync,
      strategy,
    } = job.data;

    if (!strategy) {
      console.warn("Legacy job without strategy detected, skipping");
      await this.updateSyncState(userId, { syncInProgress: false });
      return { processedCount: 0, hasMore: false, strategy: "unknown" };
    }

    try {
      await AuthService.refreshUserTokens(userId);
      const user = await UserService.findById(userId);

      if (!user?.accessToken) {
        throw new Error("Failed to get user access token");
      }

      const gmail = getGmailClient(user.accessToken);
      const query = this.buildGmailQuery(strategy);
      const config = BATCH_CONFIG.SYNC_CONFIGS[strategy];

      console.log(
        `Processing ${strategy} sync for user ${userId} (batch size: ${config.batchSize})`
      );

      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: config.batchSize,
        pageToken: pageToken || undefined,
        q: query,
      });

      const messages = response.data.messages || [];
      if (!messages.length) {
        console.log("No messages found");
        await this.updateSyncState(userId, {
          syncInProgress: false,
          isInitialSyncing: false,
        });
        return { processedCount: 0, hasMore: false, strategy };
      }

      const processor = new EmailBatchProcessor(
        gmail,
        userId,
        user.accessToken
      );
      const processedCount = await processor.processBatch(messages);

      const hasMore = !!response.data.nextPageToken;
      const shouldContinue = this.shouldContinueSync(
        strategy,
        hasMore,
        isInitialSync
      );

      await this.updateSyncState(userId, {
        lastSyncAt: new Date(),
        nextPageToken: response.data.nextPageToken || null,
        isInitialSyncing: shouldContinue,
        syncInProgress: shouldContinue,
      });

      if (shouldContinue && response.data.nextPageToken) {
        await this.queueNextBatch(
          userId,
          strategy,
          response.data.nextPageToken,
          isInitialSync
        );
      }

      console.log(
        `✅ ${strategy} sync: ${processedCount} emails processed, hasMore: ${hasMore}`
      );

      return { processedCount, hasMore, strategy };
    } catch (error) {
      console.error(`❌ Sync error for user ${userId}:`, error);
      await this.updateSyncState(userId, {
        syncInProgress: false,
        isInitialSyncing: false,
      });
      throw error;
    }
  }

  private static async queueNextBatch(
    userId: string,
    strategy: string,
    pageToken: string,
    isInitialSync: boolean
  ) {
    const config =
      BATCH_CONFIG.SYNC_CONFIGS[
        strategy as keyof typeof BATCH_CONFIG.SYNC_CONFIGS
      ];

    await emailSyncQueue.add(
      "sync-user-emails",
      {
        userId,
        maxResults: config.batchSize,
        pageToken,
        isInitialSync,
        strategy,
      } as EmailSyncJob,
      {
        priority: config.priority,
        delay: config.delay,
        timeout: BATCH_CONFIG.JOB_TIMEOUT_MS,
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );
  }

  private static buildGmailQuery(strategy: string): string {
    const queries = {
      quick: "newer_than:7d",
      full: "",
      incremental: "newer_than:1d",
    };
    return queries[strategy as keyof typeof queries] || "";
  }

  private static shouldContinueSync(
    strategy: string,
    hasMore: boolean,
    isInitialSync: boolean
  ): boolean {
    if (!hasMore) return false;

    switch (strategy) {
      case "quick":
      case "incremental":
        return true;
      case "full":
        return isInitialSync;
      default:
        return false;
    }
  }

  private static async updateSyncState(userId: string, data: any) {
    return prisma.syncState.upsert({
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
    });
  }
}
