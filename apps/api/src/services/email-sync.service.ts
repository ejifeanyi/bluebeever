import { gmail_v1 } from 'googleapis';
import { prisma } from '@/config/database';
import { getGmailClient } from '@/config/google';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { emailSyncQueue, emailProcessingQueue } from '@/config/queue';
import { EmailSyncJob, ParsedEmail } from '@crate/shared';

enum SyncStrategy {
  QUICK = 'quick',
  FULL = 'full',
  INCREMENTAL = 'incremental'
}

export class EmailSyncService {
  static async initiateSync(userId: string, strategy: SyncStrategy = SyncStrategy.QUICK) {
    const user = await UserService.findById(userId);
    if (!user?.accessToken) {
      throw new Error('User access token not found');
    }

    const syncState = await this.getSyncState(userId);
    if (syncState.syncInProgress) {
      throw new Error('Sync already in progress for this user');
    }

    await this.updateSyncState(userId, { syncInProgress: true });

    const config = this.getSyncConfig(strategy, syncState.isInitialSyncing);
    
    await emailSyncQueue.add('sync-user-emails', {
      userId,
      ...config,
      strategy,
      pageToken: syncState.nextPageToken,
      isInitialSync: syncState.isInitialSyncing,
    } as EmailSyncJob, {
      priority: config.priority,
      delay: 0,
    });

    return { 
      message: `${strategy} sync initiated`,
      strategy,
      estimatedEmails: config.maxResults 
    };
  }

  static async processEmailSync(job: EmailSyncJob) {
    const { userId, maxResults = 100, pageToken, isInitialSync, strategy } = job;

    try {
      await AuthService.refreshUserTokens(userId);
      const user = await UserService.findById(userId);
      
      if (!user?.accessToken) {
        throw new Error('Failed to get user access token');
      }

      const gmail = getGmailClient(user.accessToken);
      const query = this.buildGmailQuery(strategy as SyncStrategy);
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken: pageToken || undefined,
        q: query,
      });

      const messages = response.data.messages || [];
      const processedCount = await this.processBatch(messages, gmail, userId);

      const hasMore = !!response.data.nextPageToken;
      const shouldContinue = this.shouldContinueSync(strategy as SyncStrategy, hasMore, isInitialSync);

      await this.updateSyncState(userId, {
        lastSyncAt: new Date(),
        nextPageToken: response.data.nextPageToken || null,
        isInitialSyncing: shouldContinue,
        syncInProgress: shouldContinue,
      });

      if (shouldContinue && response.data.nextPageToken) {
        const nextConfig = this.getSyncConfig(strategy as SyncStrategy, true);
        await emailSyncQueue.add('sync-user-emails', {
          userId,
          maxResults: nextConfig.maxResults,
          pageToken: response.data.nextPageToken,
          isInitialSync,
          strategy,
        } as EmailSyncJob, {
          priority: nextConfig.priority,
          delay: nextConfig.delay,
        });
      }

      return {
        processedCount,
        hasMore,
        strategy,
      };

    } catch (error) {
      await this.getSyncState(userId);
      await this.updateSyncState(userId, { syncInProgress: false });
      throw error;
    }
  }

  private static getSyncConfig(strategy: SyncStrategy, isOngoing: boolean = false) {
    const configs = {
      [SyncStrategy.QUICK]: {
        maxResults: 50,
        priority: 1,
        delay: 0,
      },
      [SyncStrategy.FULL]: {
        maxResults: isOngoing ? 100 : 50,
        priority: isOngoing ? 5 : 3,
        delay: isOngoing ? 2000 : 500,
      },
      [SyncStrategy.INCREMENTAL]: {
        maxResults: 25,
        priority: 2,
        delay: 0,
      },
    };

    return configs[strategy];
  }

  private static buildGmailQuery(strategy: SyncStrategy): string {
    const queries = {
      [SyncStrategy.QUICK]: 'newer_than:7d',
      [SyncStrategy.FULL]: '',
      [SyncStrategy.INCREMENTAL]: 'newer_than:1d',
    };

    return queries[strategy];
  }

  private static shouldContinueSync(strategy: SyncStrategy, hasMore: boolean, isInitialSync: boolean): boolean {
    if (!hasMore) return false;
    
    switch (strategy) {
      case SyncStrategy.QUICK:
        return false;
      case SyncStrategy.INCREMENTAL:
        return false;
      case SyncStrategy.FULL:
        return isInitialSync;
      default:
        return false;
    }
  }

  private static async processBatch(
    messages: gmail_v1.Schema$Message[],
    gmail: gmail_v1.Gmail,
    userId: string
  ): Promise<number> {
    if (messages.length === 0) return 0;

    const existingMessageIds = await this.getExistingMessageIds(
      messages.map(m => m.id!).filter(Boolean)
    );

    const newMessages = messages.filter(m => m.id && !existingMessageIds.has(m.id));
    if (newMessages.length === 0) return 0;

    const emailPromises = newMessages.map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });
      return this.parseGmailMessage(fullMessage.data, userId);
    });

    const parsedEmails = (await Promise.all(emailPromises)).filter(Boolean) as ParsedEmail[];
    const savedEmails = await this.batchInsertEmails(parsedEmails);
    
    await this.queueEmailProcessing(savedEmails);
    
    return savedEmails.length;
  }

  private static async getExistingMessageIds(messageIds: string[]): Promise<Set<string>> {
    const existing = await prisma.email.findMany({
      where: { messageId: { in: messageIds } },
      select: { messageId: true },
    });
    
    return new Set(existing.map(e => e.messageId));
  }

  private static async batchInsertEmails(emails: ParsedEmail[]) {
    if (emails.length === 0) return [];
    
    return prisma.$transaction(
      emails.map(email => prisma.email.create({ data: email }))
    );
  }

  private static async queueEmailProcessing(emails: any[]) {
    const jobs = emails.map(email => ({
      name: 'process-email',
      data: {
        emailId: email.id,
        userId: email.userId,
        emailData: email,
      },
      opts: {
        priority: 3,
        delay: 0,
      },
    }));

    await emailProcessingQueue.addBulk(jobs);
  }

  private static async getSyncState(userId: string) {
    return prisma.syncState.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        isInitialSyncing: true,
        syncInProgress: false,
      },
    });
  }

  private static async updateSyncState(userId: string, data: any) {
    return prisma.syncState.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        isInitialSyncing: true,
        syncInProgress: false,
        ...data,
      },
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