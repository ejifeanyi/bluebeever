import { CategoryBatchProcessor } from "../services/category-batch-processor.service";

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

export class CategorizationWorker {
  private processor: CategoryBatchProcessor;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.processor = new CategoryBatchProcessor();
  }

  start(intervalMs = 5000): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, intervalMs);

    console.log("Categorization worker started");
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log("Categorization worker stopped");
  }

  async addEmail(email: QueuedEmail): Promise<void> {
    await this.processor.addToQueue(email);
  }

  async addEmails(emails: QueuedEmail[]): Promise<void> {
    await this.processor.addToQueue(...emails);
  }

  private async processQueue(): Promise<ProcessingResult[]> {
    if (this.isProcessing) return [];

    this.isProcessing = true;
    const results: ProcessingResult[] = [];

    try {
      // Process high priority first
      const highPriorityResults = await this.processor.processBatch("high");
      results.push(...highPriorityResults);

      // Then normal priority
      const normalPriorityResults = await this.processor.processBatch("normal");
      results.push(...normalPriorityResults);

      // Finally low priority
      const lowPriorityResults = await this.processor.processBatch("low");
      results.push(...lowPriorityResults);

      if (results.length > 0) {
        console.log(`Processed ${results.length} emails:`, {
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        });
      }

      return results;
    } catch (error) {
      console.error("Queue processing error:", error);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  async getQueueStats(): Promise<{
    high: number;
    normal: number;
    low: number;
    total: number;
  }> {
    return this.processor.getQueueStats();
  }

  async clearQueue(): Promise<void> {
    await this.processor.clearQueue();
  }
}

// Singleton instance
export const categorizationWorker = new CategorizationWorker();
