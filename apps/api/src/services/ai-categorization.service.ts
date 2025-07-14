import { env } from '@/config/env';

interface CategoryResult {
  assigned_category: string;
  confidence_score: number;
  category_description: string;
  is_new_category: boolean;
}

interface AiServiceResponse {
  assigned_category?: string;
  confidence_score?: number;
  category_description?: string;
  is_new_category?: boolean;
}



export class AiCategorizationService {
  static async categorizeEmail(email: any): Promise<CategoryResult> {
    try {
     const response = await fetch(`${env.AI_SERVICE_URL}/categorize/standalone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: email.id || email.messageId,
          user_id: email.userId,
          subject: email.subject,
          body: email.body,
          snippet: email.snippet,
          sender_email: email.from,
          recipient_emails: email.to,
          timestamp: email.date,
          labels: email.labels,
        }),
      });
      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json() as AiServiceResponse;
      console.log('AI categorization result:', result);
      
      return {
        assigned_category: result.assigned_category || 'Other',
        confidence_score: result.confidence_score ?? 0.5,
        category_description: result.category_description || 'AI categorized email',
        is_new_category: result.is_new_category ?? false,
      };
    } catch (error) {
      console.error('AI categorization failed:', error);

      /*
AI categorization result: {
  email_id: 'cmch0a6y500edmtec402q5f72',
  user_id: 'cmce6r9lr00005sz3opnmysig',
  assigned_category: 'Jobs Related',
  confidence_score: 0.8080222901591054,
  is_new_category: false,
  processing_timestamp: '2025-06-29T03:07:14.887184',
  category_description: 'Auto-generated: 30+ new jobs in Canada...'
}
      */
      
      return {
        assigned_category: this.fallbackCategory(email),
        confidence_score: 0.1,
        category_description: 'Fallback category due to AI service error',
        is_new_category: false,
      };
    }
  }

  static async categorizeThread(thread: {
    thread_id: string;
    user_id: string;
    emails: Array<{
      email_id: string;
      subject: string;
      body: string;
      snippet?: string;
      sender_email: string;
      timestamp: string | Date;
      labels?: string[];
    }>;
  }): Promise<CategoryResult> {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/categorize/threaded`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thread),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json() as AiServiceResponse;
      console.log('AI categorization result:', result);

      return {
        assigned_category: result.assigned_category || 'Other',
        confidence_score: result.confidence_score || 0.5,
        category_description: result.category_description || 'AI categorized thread',
        is_new_category: result.is_new_category || false,
      };
    } catch (error) {
      console.error('AI thread categorization failed:', error);

      return {
        assigned_category: 'Other',
        confidence_score: 0.1,
        category_description: 'Fallback category due to AI service error',
        is_new_category: false,
      };
    }
  }

  private static fallbackCategory(email: any): string {
    const subject = email.subject?.toLowerCase() || '';
    const from = email.from?.toLowerCase() || '';
    
    if (subject.includes('bill') || subject.includes('invoice') || subject.includes('payment')) {
      return 'Bills';
    }
    
    if (subject.includes('promotion') || subject.includes('sale') || subject.includes('discount') || 
        from.includes('no-reply') || from.includes('noreply')) {
      return 'Promotions';
    }
    
    if (from.includes('linkedin') || from.includes('github') || from.includes('slack')) {
      return 'Work';
    }
    
    if (subject.includes('urgent') || subject.includes('important') || subject.includes('asap')) {
      return 'Important';
    }
    
    return 'Personal';
  }
}