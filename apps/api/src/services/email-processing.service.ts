import { prisma } from '@/config/database';
import { EmailProcessingJob } from '@crate/shared';
import { AiCategorizationService } from './ai-categorization.service';

export class EmailProcessingService {
  static async processEmail(job: EmailProcessingJob) {
  const { emailId, emailData } = job;

  try {
    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    // Decide: standalone or thread
    if (email.threadId) {
      // Fetch all emails in the thread
      const threadEmails = await prisma.email.findMany({
        where: { threadId: email.threadId, userId: email.userId },
        orderBy: { date: 'asc' },
      });

      // If more than one email in thread, use thread categorization
      if (threadEmails.length > 1) {
        const threadPayload = {
          thread_id: email.threadId,
          user_id: email.userId,
          emails: threadEmails.map(e => ({
            email_id: e.id,
            subject: e.subject,
            body: e.body,
            snippet: e.snippet,
            sender_email: e.from,
            timestamp: e.date,
            labels: e.labels,
          })),
        };

        const categoryResult = await AiCategorizationService.categorizeThread(threadPayload);

        // Optionally, update all emails in the thread with the result
        await Promise.all(threadEmails.map(e =>
          this.updateEmailWithCategory(e.id, categoryResult)
        ));

        await this.enrichEmailData(emailId, emailData);
        await this.updateProcessingStatus(emailId, 'processed');

        return {
          success: true,
          emailId,
          category: categoryResult.assigned_category,
          confidence: categoryResult.confidence_score,
        };
      }
    }

    // Fallback: standalone
    const categoryResult = await AiCategorizationService.categorizeEmail(email);

    await this.updateEmailWithCategory(emailId, categoryResult);
    await this.enrichEmailData(emailId, emailData);
    await this.updateProcessingStatus(emailId, 'processed');

    return {
      success: true,
      emailId,
      category: categoryResult.assigned_category,
      confidence: categoryResult.confidence_score,
    };
  } catch (error) {
    console.error(`Email processing failed for ${emailId}:`, error);
    await this.updateProcessingStatus(emailId, 'failed');
    throw error;
  }
}

  private static async updateEmailWithCategory(emailId: string, categoryResult: any) {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        category: categoryResult.assigned_category,
        categoryConfidence: categoryResult.confidence_score,
        categoryDescription: categoryResult.category_description,
        isNewCategory: categoryResult.is_new_category,
        categorizedAt: new Date(),
      },
    });
  }

  private static async enrichEmailData(emailId: string, emailData: any) {
    const updates: any = {};

    if (this.isImportantEmail(emailData)) {
      updates.labels = [...(emailData.labels || []), 'IMPORTANT'];
    }

    if (this.hasAttachments(emailData)) {
      updates.hasAttachments = true;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.email.update({
        where: { id: emailId },
        data: updates,
      });
    }
  }

  private static async updateProcessingStatus(emailId: string, status: string) {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        processingStatus: status,
        processedAt: new Date(),
      },
    });
  }

  private static isImportantEmail(emailData: any): boolean {
    const importantKeywords = ['urgent', 'important', 'asap', 'priority'];
    const subject = emailData.subject?.toLowerCase() || '';
    return importantKeywords.some(keyword => subject.includes(keyword));
  }

  private static hasAttachments(emailData: any): boolean {
    return emailData.attachments && emailData.attachments.length > 0;
  }
}