import { env } from "@/config/env";

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

interface BatchCategoryResult extends CategoryResult {
  email_id: string;
}

interface BatchAiServiceResponse {
  results: Array<{
    email_id: string;
    assigned_category?: string;
    confidence_score?: number;
    category_description?: string;
    is_new_category?: boolean;
  }>;
}

export class AiCategorizationService {
  static async categorizeEmail(email: any): Promise<CategoryResult> {
    try {
      const response = await fetch(
        `${env.AI_SERVICE_URL}/categorize/standalone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        }
      );

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = (await response.json()) as AiServiceResponse;

      return {
        assigned_category: result.assigned_category || "Other",
        confidence_score: result.confidence_score ?? 0.5,
        category_description:
          result.category_description || "AI categorized email",
        is_new_category: result.is_new_category ?? false,
      };
    } catch (error) {
      console.error("AI categorization failed:", error);
      return {
        assigned_category: this.fallbackCategory(email),
        confidence_score: 0.1,
        category_description: "Fallback category due to AI service error",
        is_new_category: false,
      };
    }
  }

  static async categorizeEmailBatch(
    emails: any[]
  ): Promise<BatchCategoryResult[]> {
    if (!emails.length) return [];

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/categorize/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emails.map((email) => ({
            email_id: email.id || email.messageId,
            user_id: email.userId,
            subject: email.subject,
            body: email.body,
            snippet: email.snippet,
            sender_email: email.from,
            recipient_emails: email.to,
            timestamp: email.date,
            labels: email.labels,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI batch service error: ${response.status}`);
      }

      const result = (await response.json()) as BatchAiServiceResponse;

      return result.results.map((r) => ({
        email_id: r.email_id,
        assigned_category: r.assigned_category || "Other",
        confidence_score: r.confidence_score ?? 0.5,
        category_description: r.category_description || "AI categorized email",
        is_new_category: r.is_new_category ?? false,
      }));
    } catch (error) {
      console.error("AI batch categorization failed:", error);

      // Fallback to individual categorization for each email
      return emails.map((email) => ({
        email_id: email.id || email.messageId,
        assigned_category: this.fallbackCategory(email),
        confidence_score: 0.1,
        category_description: "Fallback category due to AI service error",
        is_new_category: false,
      }));
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
      const response = await fetch(
        `${env.AI_SERVICE_URL}/categorize/threaded`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(thread),
        }
      );

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = (await response.json()) as AiServiceResponse;

      return {
        assigned_category: result.assigned_category || "Other",
        confidence_score: result.confidence_score || 0.5,
        category_description:
          result.category_description || "AI categorized thread",
        is_new_category: result.is_new_category || false,
      };
    } catch (error) {
      console.error("AI thread categorization failed:", error);

      return {
        assigned_category: "Other",
        confidence_score: 0.1,
        category_description: "Fallback category due to AI service error",
        is_new_category: false,
      };
    }
  }

  private static fallbackCategory(email: any): string {
    const subject = email.subject?.toLowerCase() || "";
    const from = email.from?.toLowerCase() || "";

    if (
      subject.includes("bill") ||
      subject.includes("invoice") ||
      subject.includes("payment")
    ) {
      return "Bills";
    }

    if (
      subject.includes("promotion") ||
      subject.includes("sale") ||
      subject.includes("discount") ||
      from.includes("no-reply") ||
      from.includes("noreply")
    ) {
      return "Promotions";
    }

    if (
      from.includes("linkedin") ||
      from.includes("github") ||
      from.includes("slack")
    ) {
      return "Work";
    }

    if (
      subject.includes("urgent") ||
      subject.includes("important") ||
      subject.includes("asap")
    ) {
      return "Important";
    }

    return "Personal";
  }
}
