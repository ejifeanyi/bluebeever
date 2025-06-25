import axios from 'axios';
import { Email } from '@crate/shared';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface StandaloneEmailRequest {
  email_id: string;
  user_id: string;
  subject: string;
  body: string;
  snippet: string;
  sender_email: string;
  recipient_emails: string[];
  timestamp: string;
  labels: string[];
}

interface ThreadedEmailRequest extends StandaloneEmailRequest {
  thread_subject: string;
  previous_category: string;
  thread_id: string;
}

interface AICategoryResponse {
  email_id: string;
  user_id: string;
  assigned_category: string;
  confidence_score: number;
  is_new_category: boolean;
  processing_timestamp: string;
  category_description: string;
}

export class AiCategorizationService {
  private static AI_SERVICE_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  private static TIMEOUT = 30000;

  static async categorizeStandaloneEmail(email: Email): Promise<AICategoryResponse> {
    const request: StandaloneEmailRequest = {
      email_id: email.id,
      user_id: email.userId,
      subject: email.subject,
      body: email.body,
      snippet: email.snippet,
      sender_email: email.from,
      recipient_emails: email.to,
      timestamp: email.date.toISOString(),
      labels: email.labels,
    };

    try {
      const response = await axios.post<AICategoryResponse>(
        `${this.AI_SERVICE_BASE_URL}/categorize/standalone`,
        request,
        {
          timeout: this.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Failed to categorize standalone email ${email.id}:`, error);
      throw new Error(`AI categorization failed: ${error}`);
    }
  }

  static async categorizeThreadedEmail(
    email: Email,
    threadSubject: string,
    previousCategory?: string
  ): Promise<AICategoryResponse> {
    const request: ThreadedEmailRequest = {
      email_id: email.id,
      user_id: email.userId,
      subject: email.subject,
      body: email.body,
      snippet: email.snippet,
      sender_email: email.from,
      recipient_emails: email.to,
      timestamp: email.date.toISOString(),
      labels: email.labels,
      thread_subject: threadSubject,
      previous_category: previousCategory || '',
      thread_id: email.threadId,
    };

    try {
      const response = await axios.post<AICategoryResponse>(
        `${this.AI_SERVICE_BASE_URL}/categorize/threaded`,
        request,
        {
          timeout: this.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Failed to categorize threaded email ${email.id}:`, error);
      throw new Error(`AI categorization failed: ${error}`);
    }
  }

  static async categorizeEmail(email: Email): Promise<AICategoryResponse> {
    try {
      const threadEmails = await this.getThreadEmails(email.userId, email.threadId);
      
      if (threadEmails.length <= 1) {
        return await this.categorizeStandaloneEmail(email);
      }

      const threadSubject = this.extractThreadSubject(threadEmails);
      const previousCategory = this.findPreviousCategory(threadEmails, email.id);

      return await this.categorizeThreadedEmail(email, threadSubject, previousCategory);
    } catch (error) {
      console.error(`Email categorization failed for ${email.id}:`, error);
      throw error;
    }
  }

  private static async getThreadEmails(userId: string, threadId: string): Promise<Email[]> {
    const { prisma } = await import('@/config/database');
    return prisma.email.findMany({
      where: {
        userId,
        threadId,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  private static extractThreadSubject(threadEmails: Email[]): string {
    const firstEmail = threadEmails[0];
    return firstEmail?.subject || '';
  }

  private static findPreviousCategory(threadEmails: Email[], currentEmailId: string): string | undefined {
    const currentIndex = threadEmails.findIndex(email => email.id === currentEmailId);
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      const email = threadEmails[i];
      if (email.category) {
        return email.category;
      }
    }
    
    return undefined;
  }
}