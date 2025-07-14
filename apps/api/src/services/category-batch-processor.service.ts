import { AiCategorizationService } from "@/services/ai-categorization.service";

interface QueuedEmail {
  id: string;
  userId: string;
  subject: string;
  body: string;
  snippet?: string;
  from: string;
  to: string[];
  date: Date;
  labels?: string[];
  priority: "high" | "normal" | "low";
  retryCount: number;
}

interface ProcessingResult {
  emailId: string;
  success: boolean;
  category?: string;
  error?: string;
}

export class CategoryBatchProcessor {
  private queues: {
    high: QueuedEmail[];
    normal: QueuedEmail[];
    low: QueuedEmail[];
  } = {
    high: [],
    normal: [],
    low: [],
  };

  private readonly BATCH_SIZE = 10;
  private readonly MAX_RETRIES = 3;

  async addToQueue(...emails: QueuedEmail[]): Promise<void> {
    for (const email of emails) {
      this.queues[email.priority].push(email);
    }
  }

  async processBatch(
    priority: "high" | "normal" | "low"
  ): Promise<ProcessingResult[]> {
    const queue = this.queues[priority];
    if (queue.length === 0) return [];

    const batch = queue.splice(0, this.BATCH_SIZE);
    const results: ProcessingResult[] = [];

    try {
      // Group by user for better batching
      const userBatches = this.groupByUser(batch);

      for (const [userId, emails] of Object.entries(userBatches)) {
        const userResults = await this.processUserBatch(emails);
        results.push(...userResults);
      }

      return results;
    } catch (error) {
      console.error(`Batch processing failed for ${priority} priority:`, error);

      // Re-queue failed items with retry logic
      for (const email of batch) {
        if (email.retryCount < this.MAX_RETRIES) {
          email.retryCount++;
          this.queues[email.priority].push(email);
        } else {
          results.push({
            emailId: email.id,
            success: false,
            error: "Max retries exceeded",
          });
        }
      }

      return results;
    }
  }

  private async processUserBatch(
    emails: QueuedEmail[]
  ): Promise<ProcessingResult[]> {
    try {
      const batchResults =
        await AiCategorizationService.categorizeEmailBatch(emails);

      return batchResults.map((result) => ({
        emailId: result.email_id,
        success: true,
        category: result.assigned_category,
      }));
    } catch (error) {
      console.error("User batch processing failed:", error);

      // Fallback to individual processing
      const results: ProcessingResult[] = [];
      for (const email of emails) {
        try {
          const result = await AiCategorizationService.categorizeEmail(email);
          results.push({
            emailId: email.id,
            success: true,
            category: result.assigned_category,
          });
        } catch (err) {
          results.push({
            emailId: email.id,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return results;
    }
  }

  private groupByUser(emails: QueuedEmail[]): Record<string, QueuedEmail[]> {
    return emails.reduce(
      (acc, email) => {
        if (!acc[email.userId]) {
          acc[email.userId] = [];
        }
        acc[email.userId].push(email);
        return acc;
      },
      {} as Record<string, QueuedEmail[]>
    );
  }

  async getQueueStats(): Promise<{
    high: number;
    normal: number;
    low: number;
    total: number;
  }> {
    const stats = {
      high: this.queues.high.length,
      normal: this.queues.normal.length,
      low: this.queues.low.length,
      total: 0,
    };

    stats.total = stats.high + stats.normal + stats.low;
    return stats;
  }

  async clearQueue(): Promise<void> {
    this.queues.high = [];
    this.queues.normal = [];
    this.queues.low = [];
  }

  // Get emails by priority for monitoring
  getQueuedEmails(priority: "high" | "normal" | "low"): QueuedEmail[] {
    return [...this.queues[priority]];
  }
}
