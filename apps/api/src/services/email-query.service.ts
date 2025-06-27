import { prisma } from '@/config/database';

interface EmailFilters {
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  labels?: string[];
  category?: string;
}

export class EmailQueryService {
  static async getUserEmails(
    userId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
    filters?: EmailFilters
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = { userId };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
        { snippet: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = filters.dateFrom;
      if (filters.dateTo) where.date.lte = filters.dateTo;
    }

    if (filters?.labels?.length) {
      where.labels = { hasSome: filters.labels };
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          threadId: true,
          messageId: true,
          subject: true,
          from: true,
          to: true,
          snippet: true,
          isRead: true,
          date: true,
          labels: true,
          hasAttachments: true,
          category: true,
          categoryConfidence: true,
          categoryDescription: true,
          categorizedAt: true,
        },
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

  static async getEmailById(userId: string, id: string) {
    return prisma.email.findFirst({
      where: { userId, id },
    });
  }

  static async markAsRead(userId: string, id: string) {
    return prisma.email.updateMany({
      where: { userId, id },
      data: { isRead: true },
    });
  }

  static async getUserEmailStats(userId: string) {
    const [total, unread, withAttachments, categorized, syncState] = await Promise.all([
      prisma.email.count({ where: { userId } }),
      prisma.email.count({ where: { userId, isRead: false } }),
      prisma.email.count({ where: { userId, hasAttachments: true } }),
      prisma.email.count({ where: { userId, category: { not: null } } }),
      prisma.syncState.findUnique({ where: { userId } }),
    ]);

    const lastSyncAt = syncState?.lastSyncAt;
    const syncInProgress = syncState?.syncInProgress || false;

    return {
      total,
      unread,
      withAttachments,
      categorized,
      uncategorized: total - categorized,
      lastSyncAt,
      syncInProgress,
    };
  }

  static async getSyncStatus(userId: string) {
    const syncState = await prisma.syncState.findUnique({
      where: { userId },
    });

    if (!syncState) {
      return {
        syncInProgress: false,
        isInitialSyncing: true,
        lastSyncAt: null,
        emailCount: 0,
      };
    }

    const emailCount = await prisma.email.count({ where: { userId } });

    return {
      syncInProgress: syncState.syncInProgress,
      isInitialSyncing: syncState.isInitialSyncing,
      lastSyncAt: syncState.lastSyncAt,
      emailCount,
    };
  }
}