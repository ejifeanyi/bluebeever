import { gmail_v1 } from 'googleapis';
import { prisma } from '@/config/database';
import { getGmailClient } from '@/config/google';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

export class EmailService {
  static async syncUserEmails(userId: string, maxResults = 100) {
    const user = await UserService.findById(userId);
    
    if (!user?.accessToken) {
      throw new Error('User access token not found');
    }

    await AuthService.refreshUserTokens(userId);
    const refreshedUser = await UserService.findById(userId);
    
    if (!refreshedUser?.accessToken) {
      throw new Error('Failed to refresh user tokens');
    }

    const gmail = getGmailClient(refreshedUser.accessToken);

    let syncState = await prisma.syncState.findUnique({
      where: { userId },
    });

    if (!syncState) {
      syncState = await prisma.syncState.create({
        data: {
          userId,
          isInitialSyncing: true,
          syncInProgress: true,
        },
      });
    }

    if (syncState.syncInProgress) {
      throw new Error('Sync already in progress for this user');
    }

    await prisma.syncState.update({
      where: { userId },
      data: { syncInProgress: true },
    });

    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken: syncState.nextPageToken || undefined,
      });

      const messages = response.data.messages || [];
      const emailsProcessed = [];

      for (const message of messages) {
        if (!message.id) continue;

        const existingEmail = await prisma.email.findUnique({
          where: { messageId: message.id },
        });

        if (existingEmail) continue;

        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const emailData = this.parseGmailMessage(fullMessage.data, userId);
        
        if (emailData) {
          const savedEmail = await prisma.email.create({
            data: emailData,
          });
          emailsProcessed.push(savedEmail);
        }
      }

      await prisma.syncState.update({
        where: { userId },
        data: {
          lastSyncAt: new Date(),
          nextPageToken: response.data.nextPageToken || null,
          isInitialSyncing: !response.data.nextPageToken ? false : syncState.isInitialSyncing,
          syncInProgress: false,
        },
      });

      return {
        emailsProcessed: emailsProcessed.length,
        hasMore: !!response.data.nextPageToken,
        nextPageToken: response.data.nextPageToken,
      };

    } catch (error) {
      await prisma.syncState.update({
        where: { userId },
        data: { syncInProgress: false },
      });
      throw error;
    }
  }

  static async getUserEmails(
    userId: string,
    page = 1,
    limit = 50,
    search?: string
  ) {
    const offset = (page - 1) * limit;

    const where: any = { userId };
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.email.count({ where }),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getEmailById(userId: string, emailId: string) {
    return prisma.email.findFirst({
      where: {
        id: emailId,
        userId,
      },
    });
  }

  static async markAsRead(userId: string, emailId: string) {
    return prisma.email.updateMany({
      where: {
        id: emailId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  private static parseGmailMessage(message: gmail_v1.Schema$Message, userId: string) {
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