import {
  allQueues,
  emailSyncQueue,
  emailProcessingQueue,
  emailStorageQueue,
  categorizationQueue,
} from "../config/queue";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface QueueHealth {
  name: string;
  status: "healthy" | "warning" | "error";
  stats: QueueStats;
  workers: number;
}

export class QueueManager {
  async getQueueHealth(): Promise<QueueHealth[]> {
    const healthChecks = await Promise.all(
      allQueues.map(async (queue) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all(
          [
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed(),
          ]
        );

        const stats: QueueStats = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
        };

        return {
          name: queue.name,
          status: this.determineStatus(stats),
          stats,
          workers: 0,
        };
      })
    );

    return healthChecks;
  }

  async triggerEmailSync(userId: string, provider: string) {
    const job = await emailSyncQueue.add("sync-user-emails", {
      userId,
      provider,
      lastSyncTime: new Date(Date.now() - 24 * 60 * 60 * 1000), 
    });

    console.log(`Email sync triggered for user ${userId}`, { jobId: job.id });
    return job.id;
  }

  async processEmailBatch(
    emails: Array<{ id: string; userId: string; rawEmail: any }>
  ) {
    const jobs = await Promise.all(
      emails.map((email) =>
        emailProcessingQueue.add("process-email", {
          emailId: email.id,
          userId: email.userId,
          rawEmail: email.rawEmail,
        })
      )
    );

    console.log(`Batch processing ${emails.length} emails`);
    return jobs.map((job) => job.id);
  }

  async retryFailedJobs(queueName: string, maxRetries = 10) {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const failedJobs = await queue.getFailed(0, maxRetries);
    const retryPromises = failedJobs.map((job) => job.retry());

    await Promise.all(retryPromises);
    console.log(`Retried ${failedJobs.length} failed jobs in ${queueName}`);

    return failedJobs.length;
  }

  async clearQueue(
    queueName: string,
    status: "completed" | "failed" = "completed"
  ) {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    await queue.clean(0, status);
    console.log(`Cleared ${status} jobs from ${queueName}`);
  }

  async pauseQueue(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    await queue.pause();
    console.log(`Paused queue ${queueName}`);
  }

  async resumeQueue(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    await queue.resume();
    console.log(`Resumed queue ${queueName}`);
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      data: job.data,
      progress: job.progress(),
      attempts: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }

  private getQueueByName(name: string) {
    return allQueues.find((queue) => queue.name === name);
  }

  private determineStatus(stats: QueueStats): "healthy" | "warning" | "error" {
    if (stats.failed > 50) return "error";
    if (stats.failed > 10 || stats.waiting > 1000) return "warning";
    return "healthy";
  }

  async gracefulShutdown() {
    console.log("Starting graceful shutdown of queues...");

    const timeout = 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const activeJobs = await Promise.all(
        allQueues.map((queue) => queue.getActive())
      );

      const totalActive = activeJobs.reduce(
        (sum, jobs) => sum + jobs.length,
        0
      );
      if (totalActive === 0) break;

      console.log(`Waiting for ${totalActive} active jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await Promise.all(allQueues.map((queue) => queue.close()));
    console.log("All queues closed successfully");
  }
}

export const queueManager = new QueueManager();
