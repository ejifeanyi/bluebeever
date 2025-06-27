import { env } from '@/config/env';

interface CategoryResult {
  assigned_category: string;
  confidence_score: number;
  category_description: string;
  is_new_category: boolean;
}

// Type for the AI service response
interface AiServiceResponse {
  category?: string;
  confidence?: number;
  description?: string;
  isNew?: boolean;
}

export class AiCategorizationService {
  static async categorizeEmail(email: any): Promise<CategoryResult> {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/categorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Removed authentication since it's handled by the express app
        },
        body: JSON.stringify({
          subject: email.subject,
          from: email.from,
          body: email.body || email.snippet,
          snippet: email.snippet,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json() as AiServiceResponse;
      
      return {
        assigned_category: result.category || 'Other',
        confidence_score: result.confidence || 0.5,
        category_description: result.description || 'AI categorized email',
        is_new_category: result.isNew || false,
      };
    } catch (error) {
      console.error('AI categorization failed:', error);
      
      return {
        assigned_category: this.fallbackCategory(email),
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