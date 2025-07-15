import { prisma } from "@/config/database";
import { EmailProcessingJob } from "@crate/shared";
import { AiCategorizationService } from "./ai-categorization.service";
import { RETRY_CONFIGS, withRetry } from "@/utils/retry";

export class EmailProcessingService {
  static async processEmail(job: EmailProcessingJob) {
    const { emailId, emailData } = job;

    try {
      const email = await withRetry(
        () => prisma.email.findUnique({ where: { id: emailId } }),
        RETRY_CONFIGS.database
      );

      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      if (email.threadId) {
        const result = await this.processThreadEmail(email);
        if (result) return result;
      }

      const categoryResult = await withRetry(
        () => AiCategorizationService.categorizeEmail(email),
        RETRY_CONFIGS.api
      );

      await Promise.all([
        this.updateEmailWithCategory(emailId, categoryResult),
        this.enrichEmailData(emailId, emailData),
        this.updateProcessingStatus(emailId, "processed"),
      ]);

      return {
        success: true,
        emailId,
        category: categoryResult.assigned_category,
        confidence: categoryResult.confidence_score,
      };
    } catch (error) {
      console.error(`Email processing failed for ${emailId}:`, error);
      await this.updateProcessingStatus(emailId, "failed");
      throw error;
    }
  }

  private static async processThreadEmail(email: any) {
    const threadEmails = await withRetry(
      () =>
        prisma.email.findMany({
          where: { threadId: email.threadId, userId: email.userId },
          orderBy: { date: "asc" },
        }),
      RETRY_CONFIGS.database
    );

    if (threadEmails.length <= 1) return null;

    const threadPayload = {
      thread_id: email.threadId,
      user_id: email.userId,
      emails: threadEmails.map((e) => ({
        email_id: e.id,
        subject: e.subject,
        body: e.body,
        snippet: e.snippet,
        sender_email: e.from,
        timestamp: e.date,
        labels: e.labels,
      })),
    };

    const categoryResult = await withRetry(
      () => AiCategorizationService.categorizeThread(threadPayload),
      RETRY_CONFIGS.api
    );

    await Promise.all(
      threadEmails.map((e) =>
        this.updateEmailWithCategory(e.id, categoryResult)
      )
    );

    await Promise.all([
      this.enrichEmailData(email.id, { labels: email.labels }),
      this.updateProcessingStatus(email.id, "processed"),
    ]);

    return {
      success: true,
      emailId: email.id,
      category: categoryResult.assigned_category,
      confidence: categoryResult.confidence_score,
    };
  }

  private static async updateEmailWithCategory(
    emailId: string,
    categoryResult: any
  ) {
    await withRetry(
      () =>
        prisma.email.update({
          where: { id: emailId },
          data: {
            category: categoryResult.assigned_category,
            categoryConfidence: categoryResult.confidence_score,
            categoryDescription: categoryResult.category_description,
            isNewCategory: categoryResult.is_new_category,
            categorizedAt: new Date(),
          },
        }),
      RETRY_CONFIGS.database
    );
  }

  private static async enrichEmailData(emailId: string, emailData: any) {
    const updates: any = {};

    if (this.isImportantEmail(emailData)) {
      updates.labels = [...(emailData.labels || []), "IMPORTANT"];
    }

    if (this.hasAttachments(emailData)) {
      updates.hasAttachments = true;
    }

    if (Object.keys(updates).length === 0) return;

    await withRetry(
      () =>
        prisma.email.update({
          where: { id: emailId },
          data: updates,
        }),
      RETRY_CONFIGS.database
    );
  }

  private static async updateProcessingStatus(emailId: string, status: string) {
    await withRetry(
      () =>
        prisma.email.update({
          where: { id: emailId },
          data: {
            processingStatus: status,
            processedAt: new Date(),
          },
        }),
      RETRY_CONFIGS.database
    );
  }

  private static isImportantEmail(emailData: any): boolean {
    const importantKeywords = ["urgent", "important", "asap", "priority"];
    const subject = emailData.subject?.toLowerCase() || "";
    return importantKeywords.some((keyword) => subject.includes(keyword));
  }

  private static hasAttachments(emailData: any): boolean {
    return emailData.attachments?.length > 0;
  }
}
