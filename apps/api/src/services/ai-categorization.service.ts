import { env } from "@/config/env";
import { cacheService } from "./cache.service";
import crypto from "crypto";

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
    const emailId = email.id || email.messageId;
    const contentHash = crypto.createHash("sha256").update(email.subject + email.body + (email.snippet || "") + (email.from || "") + (email.to || []).join(",") + (email.date || "") + JSON.stringify(email.labels || [])).digest("hex");

    const cachedById = await cacheService.getCategoryResult(emailId);
    if (cachedById) return cachedById;
    const cachedByHash = await cacheService.getDeduplicationKey(contentHash);
    if (cachedByHash) return cachedByHash;

    try {
      const response = await fetch(
        `${env.AI_SERVICE_URL}/categorize/standalone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_id: emailId,
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
      const categoryResult: CategoryResult = {
        assigned_category: result.assigned_category || "Other",
        confidence_score: result.confidence_score ?? 0.5,
        category_description:
          result.category_description || "AI categorized email",
        is_new_category: result.is_new_category ?? false,
      };
      await cacheService.setCategoryResult(emailId, categoryResult);
      await cacheService.setDeduplicationKey(contentHash, categoryResult);
      return categoryResult;
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

    const hashes = emails.map(email => crypto.createHash("sha256").update(email.subject + email.body + (email.snippet || "") + (email.from || "") + (email.to || []).join(",") + (email.date || "") + JSON.stringify(email.labels || [])).digest("hex"));
    const ids = emails.map(email => email.id || email.messageId);

    const cachedResults = await cacheService.getCategoryBatchResults(ids);
    const cachedHashes: Record<string, any> = {};
    for (let i = 0; i < hashes.length; ++i) {
      if (!cachedResults[ids[i]]) {
        const byHash = await cacheService.getDeduplicationKey(hashes[i]);
        if (byHash) cachedHashes[ids[i]] = byHash;
      }
    }
    const allCached: BatchCategoryResult[] = [];
    for (let i = 0; i < emails.length; ++i) {
      const id = ids[i];
      if (cachedResults[id]) {
        allCached.push({ ...cachedResults[id], email_id: id });
      } else if (cachedHashes[id]) {
        allCached.push({ ...cachedHashes[id], email_id: id });
      }
    }
    const uncachedEmails = emails.filter((_, i) => !cachedResults[ids[i]] && !cachedHashes[ids[i]]);
    if (!uncachedEmails.length) return allCached;

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/categorize/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: uncachedEmails.map((email) => ({
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
      const toCache: Record<string, any> = {};
      for (let i = 0; i < uncachedEmails.length; ++i) {
        const uncachedId = uncachedEmails[i].id || uncachedEmails[i].messageId;
        const uncachedHash = hashes[emails.indexOf(uncachedEmails[i])];
        const r = result.results[i];
        const categoryResult: CategoryResult = {
          assigned_category: r.assigned_category || "Other",
          confidence_score: r.confidence_score ?? 0.5,
          category_description: r.category_description || "AI categorized email",
          is_new_category: r.is_new_category ?? false,
        };
        toCache[uncachedId] = categoryResult;
        await cacheService.setDeduplicationKey(uncachedHash, categoryResult);
      }
      await cacheService.setCategoryBatchResults(toCache);
      const batchResults: BatchCategoryResult[] = result.results.map((r, i) => ({
        email_id: uncachedEmails[i].id || uncachedEmails[i].messageId,
        assigned_category: r.assigned_category || "Other",
        confidence_score: r.confidence_score ?? 0.5,
        category_description: r.category_description || "AI categorized email",
        is_new_category: r.is_new_category ?? false,
      }));
      return [...allCached, ...batchResults];
    } catch (error) {
      console.error("AI batch categorization failed:", error);
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
