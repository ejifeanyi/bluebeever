import { Job } from "bull";
import { allQueues } from "../config/queue";
import { EmailProcessingService } from "../services/email-processing.service";

interface EmailSyncJobData {
  userId: string;
  provider: string;
  lastSyncTime?: Date;
}

interface EmailProcessingJobData {
  emailId: string;
  userId: string;
  rawEmail: any;
}

interface EmailStorageJobData {
  emailId: string;
  processedData: any;
}

interface CategorizationJobData {
  emailId: string;
  content: string;
  subject: string;
}

class ParallelProcessingWorker {
  private concurrency = {
    emailSync: 2,
    emailProcessing: 5,
    emailStorage: 10,
    categorization: 3,
  };

  start() {
    this.setupSyncWorker();
    this.setupProcessingWorker();
    this.setupStorageWorker();
    this.setupCategorizationWorker();

    console.log("Parallel processing workers started");
  }

  private setupSyncWorker() {
    const [emailSyncQueue] = allQueues;
    emailSyncQueue.process(
      this.concurrency.emailSync,
      async (job: Job<EmailSyncJobData>) => {
        const { userId, provider, lastSyncTime } = job.data;

        try {
          const newEmails = await this.syncFromProvider(
            userId,
            provider,
            lastSyncTime
          );

          const [, emailProcessingQueue] = allQueues;
          await Promise.all(
            newEmails.map((email: any) =>
              emailProcessingQueue.add("process-email", {
                emailId: email.id,
                userId,
                rawEmail: email,
              })
            )
          );

          return { synced: newEmails.length };
        } catch (error) {
          console.error("Email sync failed:", error);
          throw error;
        }
      }
    );
  }

  private setupProcessingWorker() {
    const [, emailProcessingQueue] = allQueues;
    const BATCH_SIZE = 10;
    const BATCH_INTERVAL = 100; // ms
    let batch: EmailProcessingJobData[] = [];
    let batchTimeout: NodeJS.Timeout | null = null;

    async function flushBatch() {
      if (batch.length === 0) return;
      const jobsToProcess = batch.splice(0, BATCH_SIZE);
      if (jobsToProcess.length === 1) {
        // Fallback to single processing
        await EmailProcessingService.processEmail(jobsToProcess[0]);
      } else {
        await EmailProcessingService.processEmailBatch(jobsToProcess);
      }
    }

    emailProcessingQueue.process('process-email', BATCH_SIZE, async (job) => {
      const jobData = job.data as EmailProcessingJobData;
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
  }

  private setupStorageWorker() {
    const [, , emailStorageQueue] = allQueues;
    emailStorageQueue.process(
      this.concurrency.emailStorage,
      async (job: Job<EmailStorageJobData>) => {
        const { emailId, processedData } = job.data;

        try {
          await this.storeEmail(emailId, processedData);
          return { stored: true };
        } catch (error) {
          console.error("Email storage failed:", error);
          throw error;
        }
      }
    );
  }

  private setupCategorizationWorker() {
    const [, , , categorizationQueue] = allQueues;
    categorizationQueue.process(
      this.concurrency.categorization,
      async (job: Job<CategorizationJobData>) => {
        const { emailId, content, subject } = job.data;

        try {
          const category = await this.categorizeEmail(content, subject);
          await this.updateEmailCategory(emailId, category);
          return { categorized: true, category };
        } catch (error) {
          console.error("Email categorization failed:", error);
          throw error;
        }
      }
    );
  }

  private async syncFromProvider(
    userId: string,
    provider: string,
    lastSyncTime?: Date
  ) {
    // Implementation for syncing from email provider
    // This would connect to Gmail, Outlook, etc.
    return [];
  }

  private async processEmail(rawEmail: any) {
    // Implementation for processing raw email
    // Parse headers, body, attachments, etc.
    return {
      content: rawEmail.content,
      subject: rawEmail.subject,
      sender: rawEmail.from,
      timestamp: rawEmail.date,
    };
  }

  private async storeEmail(emailId: string, processedData: any) {
    // Implementation for storing email in database
    // Save to your preferred database
  }

  private async categorizeEmail(content: string, subject: string) {
    // Implementation for categorizing email
    // Use ML model, rules, or AI service
    return "inbox";
  }

  private async updateEmailCategory(emailId: string, category: string) {
    // Implementation for updating email category
    // Update database record
  }

  stop() {
    allQueues.forEach((queue) => queue.close());
    console.log("Parallel processing workers stopped");
  }
}

export const parallelProcessingWorker = new ParallelProcessingWorker();
