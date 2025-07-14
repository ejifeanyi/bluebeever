import { gmail_v1 } from "googleapis";
import { prisma } from "@/config/database";
import { ParsedEmail } from "@crate/shared";
import { getGoogleProfilePhoto } from "@/utils/jwt";
import { getWebSocketService } from "./websocket.service";
import { emailProcessingQueue } from "@/config/queue";
import { BATCH_CONFIG } from "@/config/batch";

export class EmailBatchProcessor {
  private gmail: gmail_v1.Gmail;
  private userId: string;
  private accessToken: string;

  constructor(gmail: gmail_v1.Gmail, userId: string, accessToken: string) {
    this.gmail = gmail;
    this.userId = userId;
    this.accessToken = accessToken;
  }

  async processBatch(messages: gmail_v1.Schema$Message[]): Promise<number> {
    if (!messages.length) return 0;

    const existingIds = await this.getExistingMessageIds(
      messages.map((m) => m.id!).filter(Boolean)
    );

    const newMessages = messages
      .filter((m) => m.id && !existingIds.has(m.id))
      .sort(
        (a, b) =>
          parseInt(b.internalDate || "0") - parseInt(a.internalDate || "0")
      );

    if (!newMessages.length) return 0;

    console.log(`Processing ${newMessages.length} new messages`);

    const chunks = this.createChunks(
      newMessages,
      BATCH_CONFIG.FETCH_CHUNK_SIZE
    );
    let processedCount = 0;

    for (const chunk of chunks) {
      const parsedEmails = await this.fetchAndParseChunk(chunk);
      const savedEmails = await this.batchInsertEmails(parsedEmails);

      if (savedEmails.length) {
        await this.queueEmailProcessing(savedEmails);
        this.notifyWebSocketClients(savedEmails);
        processedCount += savedEmails.length;
      }
    }

    return processedCount;
  }

  private async fetchAndParseChunk(
    messages: gmail_v1.Schema$Message[]
  ): Promise<ParsedEmail[]> {
    const fetchPromises = messages.map(async (message) => {
      try {
        const fullMessage = await this.gmail.users.messages.get({
          userId: "me",
          id: message.id!,
          format: "full",
        });

        const parsed = this.parseGmailMessage(fullMessage.data);
        if (!parsed) return null;

        const senderEmail = this.extractEmailFromAddress(parsed.from);
        const avatarUrl = senderEmail
          ? await getGoogleProfilePhoto(senderEmail, this.accessToken)
          : null;

        return { ...parsed, avatarUrl };
      } catch (error) {
        console.error(`Error fetching message ${message.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    return results.filter(Boolean) as ParsedEmail[];
  }

  private async batchInsertEmails(emails: ParsedEmail[]) {
    if (!emails.length) return [];

    try {
      const results = await Promise.all(
        emails.map((email) =>
          prisma.email.upsert({
            where: { messageId: email.messageId },
            update: { updatedAt: new Date() },
            create: {
              ...email,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })
        )
      );

      const newEmails = results.filter(
        (email) => email.createdAt.getTime() === email.updatedAt.getTime()
      );

      console.log(
        `✅ Processed ${emails.length} emails: ${newEmails.length} new`
      );
      return newEmails;
    } catch (error) {
      console.error("Batch upsert error:", error);
      return this.fallbackIndividualInsert(emails);
    }
  }

  private async fallbackIndividualInsert(emails: ParsedEmail[]) {
    const successfulInserts: any[] = [];

    for (const email of emails) {
      try {
        const result = await prisma.email.upsert({
          where: { messageId: email.messageId },
          update: { updatedAt: new Date() },
          create: {
            ...email,
            id: email.id || crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          successfulInserts.push(result);
        }
      } catch (error) {
        console.error(`Failed to insert email ${email.messageId}:`, error);
      }
    }

    console.log(
      `✅ Fallback: ${successfulInserts.length}/${emails.length} emails inserted`
    );
    return successfulInserts;
  }

  private async queueEmailProcessing(emails: any[]) {
    const jobs = emails.map((email) => ({
      name: "process-email",
      data: {
        emailId: email.id,
        userId: email.userId,
        emailData: email,
      },
      opts: {
        priority: 3,
        delay: 0,
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    }));

    await emailProcessingQueue.addBulk(jobs);
  }

  private notifyWebSocketClients(emails: any[]) {
    try {
      const wsService = getWebSocketService();
      if (wsService.isUserConnected(this.userId)) {
        emails.forEach((email) => wsService.notifyNewEmail(this.userId, email));
      }
    } catch (error) {
      console.log("WebSocket service not available:", error);
    }
  }

  private async getExistingMessageIds(
    messageIds: string[]
  ): Promise<Set<string>> {
    const existing = await prisma.email.findMany({
      where: { messageId: { in: messageIds } },
      select: { messageId: true },
    });
    return new Set(existing.map((e) => e.messageId));
  }

  private createChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private extractEmailFromAddress(address: string): string | null {
    const match = address.match(/<(.+?)>/);
    return match ? match[1] : address.includes("@") ? address : null;
  }

  private parseGmailMessage(
    message: gmail_v1.Schema$Message
  ): ParsedEmail | null {
    if (!message.id || !message.payload) return null;

    const headers = message.payload.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value || "";

    const labels = message.labelIds || [];
    const attachments = this.extractAttachments(message.payload);

    return {
      userId: this.userId,
      threadId: message.threadId || message.id,
      messageId: message.id,
      subject: getHeader("Subject"),
      from: getHeader("From"),
      to: this.parseEmailAddresses(getHeader("To")),
      cc: this.parseEmailAddresses(getHeader("Cc")),
      bcc: this.parseEmailAddresses(getHeader("Bcc")),
      body: this.extractMessageBody(message.payload),
      snippet: message.snippet || "",
      date: new Date(parseInt(message.internalDate || "0")),
      labels,
      attachments: attachments.length ? attachments : undefined,
      isRead: !labels.includes("UNREAD"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private parseEmailAddresses(addressString: string): string[] {
    if (!addressString) return [];
    return addressString
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);
  }

  private extractMessageBody(payload: gmail_v1.Schema$MessagePart): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    if (payload.parts) {
      // Try text/plain first
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }

      // Fallback to text/html
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }

      // Recursive search
      for (const part of payload.parts) {
        const body = this.extractMessageBody(part);
        if (body) return body;
      }
    }

    return "";
  }

  private extractAttachments(payload: gmail_v1.Schema$MessagePart) {
    const attachments: any[] = [];

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }

      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    processPart(payload);
    return attachments;
  }
}
