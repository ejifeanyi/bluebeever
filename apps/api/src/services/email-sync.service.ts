import { gmail_v1 } from 'googleapis';
import { prisma } from '@/config/database';
import { getGmailClient } from '@/config/google';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { emailSyncQueue, emailProcessingQueue } from '@/config/queue';
import { EmailSyncJob, ParsedEmail } from '@crate/shared';

export class EmailSyncService {
  static async initiateSync(userId: string, maxResults = 100) {
    const user = await UserService.findById(userId);
    
    if (!user?.accessToken) {
      throw new Error('User access token not found');
    }

    const syncState = await this.getSyncState(userId);
    
    if (syncState.syncInProgress) {
      throw new Error('Sync already in progress for this user');
    }

    await this.updateSyncState(userId, { syncInProgress: true });

    await emailSyncQueue.add('sync-user-emails', {
      userId,
      maxResults,
      pageToken: syncState.nextPageToken,
      isInitialSync: syncState.isInitialSyncing,
    } as EmailSyncJob, {
      priority: syncState.isInitialSyncing ? 1 : 5,
      delay: 0,
    });

    return { message: 'Email sync initiated' };
  }

  static async processEmailSync(job: EmailSyncJob) {
    const { userId, maxResults = 100, pageToken, isInitialSync } = job;

    try {
      await AuthService.refreshUserTokens(userId);
      const user = await UserService.findById(userId);
      
      if (!user?.accessToken) {
        throw new Error('Failed to get user access token');
      }

      const gmail = getGmailClient(user.accessToken);
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken: pageToken || undefined,
      });

      const messages = response.data.messages || [];
      const batchSize = 50;
      const batches = this.createBatches(messages, batchSize);

      for (const batch of batches) {
        await this.processBatch(batch, gmail, userId);
      }

      await this.updateSyncState(userId, {
        lastSyncAt: new Date(),
        nextPageToken: response.data.nextPageToken || null,
        isInitialSyncing: response.data.nextPageToken ? isInitialSync : false,
        syncInProgress: false,
      });

      if (response.data.nextPageToken) {
        await emailSyncQueue.add('sync-user-emails', {
          userId,
          maxResults,
          pageToken: response.data.nextPageToken,
          isInitialSync,
        } as EmailSyncJob, {
          priority: isInitialSync ? 1 : 5,
          delay: 1000,
        });
      }

      return {
        processedCount: messages.length,
        hasMore: !!response.data.nextPageToken,
      };

    } catch (error) {
      await this.updateSyncState(userId, { syncInProgress: false });
      throw error;
    }
  }

  private static async processBatch(
    messages: gmail_v1.Schema$Message[],
    gmail: gmail_v1.Gmail,
    userId: string
  ) {
    const emailPromises = messages.map(async (message) => {
      if (!message.id) return null;

      const exists = await prisma.email.findUnique({
        where: { messageId: message.id },
        select: { id: true },
      });

      if (exists) return null;

      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      return this.parseGmailMessage(fullMessage.data, userId);
    });

    const parsedEmails = (await Promise.all(emailPromises)).filter(Boolean) as ParsedEmail[];
    
    if (parsedEmails.length === 0) return;

    const savedEmails = await this.batchInsertEmails(parsedEmails);
    
    for (const email of savedEmails) {
      await emailProcessingQueue.add('process-email', {
        emailId: email.id,
        userId: email.userId,
        emailData: email,
      }, {
        priority: 3,
        delay: 0,
      });
    }
  }

  private static async batchInsertEmails(emails: ParsedEmail[]) {
    const insertPromises = emails.map(email => 
      prisma.email.create({ data: email })
    );

    return Promise.all(insertPromises);
  }

  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private static async getSyncState(userId: string) {
    let syncState = await prisma.syncState.findUnique({
      where: { userId },
    });

    if (!syncState) {
      syncState = await prisma.syncState.create({
        data: {
          userId,
          isInitialSyncing: true,
          syncInProgress: false,
        },
      });
    }

    return syncState;
  }

  private static async updateSyncState(userId: string, data: any) {
    return prisma.syncState.update({
      where: { userId },
      data,
    });
  }

  private static parseGmailMessage(message: gmail_v1.Schema$Message, userId: string): ParsedEmail | null {
    if (!message.id || !message.payload) return null;

    const headers = message.payload.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = this.parseEmailAddresses(getHeader('To'));
    const cc = this.parseEmailAddresses(getHeader('Cc'));
    const bcc = this.parseEmailAddresses(getHeader('Bcc'));
    const date = new Date(parseInt(message.internalDate || '0'));

    const body = this.extractMessageBody(message.payload);
    const snippet = message.snippet || '';
    const labels = message.labelIds || [];
    const attachments = this.extractAttachments(message.payload);

    return {
      userId,
      id: message.id,
      threadId: message.threadId || message.id,
      messageId: message.id,
      subject,
      from,
      to,
      cc,
      bcc,
      body,
      snippet,
      date,
      labels,
      attachments: attachments.length > 0 ? attachments : undefined,
      isRead: !labels.includes('UNREAD'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private static parseEmailAddresses(addressString: string): string[] {
    if (!addressString) return [];
    
    return addressString
      .split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  }

  private static extractMessageBody(payload: gmail_v1.Schema$MessagePart): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      for (const part of payload.parts) {
        const body = this.extractMessageBody(part);
        if (body) return body;
      }
    }

    return '';
  }

  private static extractAttachments(payload: gmail_v1.Schema$MessagePart) {
    const attachments: any[] = [];

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
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
