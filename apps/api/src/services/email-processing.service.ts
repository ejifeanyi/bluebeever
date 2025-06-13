import { prisma } from '@/config/database';
import { EmailProcessingJob } from '@crate/shared';

export class EmailProcessingService {
  static async processEmail(job: EmailProcessingJob) {
    const { emailId, userId, emailData } = job;

    try {
      await this.enrichEmailData(emailId, emailData);
      
      await this.updateProcessingStatus(emailId, 'processed');
      
      return { success: true, emailId };
    } catch (error) {
      await this.updateProcessingStatus(emailId, 'failed');
      throw error;
    }
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