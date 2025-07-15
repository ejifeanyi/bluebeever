import { prisma } from "@/config/database";
import { cacheService } from "./cache.service";

interface EmailFilters {
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  labels?: string[];
  category?: string;
}

interface PaginatedEmailsResult {
  emails: any[];
  nextPageEmails?: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
  };
}

export class EmailQueryService {
  static async getUserEmails(
    userId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
    filters?: EmailFilters
  ): Promise<PaginatedEmailsResult> {
    const cacheKey = cacheService.emailsKey(
      userId,
      page,
      limit,
      search,
      filters
    );
    const cached = cacheService.get<PaginatedEmailsResult>(cacheKey);

    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { from: { contains: search, mode: "insensitive" } },
        { snippet: { contains: search, mode: "insensitive" } },
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

    const extendedLimit = limit * 2;
    const [allEmails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: extendedLimit,
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
          avatarUrl: true,
        },
      }),
      prisma.email.count({ where }),
    ]);

    const currentPageEmails = allEmails.slice(0, limit);
    const nextPageEmails = allEmails.slice(limit);
    const hasNextPage = skip + limit < total;

    const result: PaginatedEmailsResult = {
      emails: currentPageEmails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage,
      },
    };

    if (nextPageEmails.length > 0 && hasNextPage) {
      result.nextPageEmails = nextPageEmails;
    }

    cacheService.set(cacheKey, result, 2 * 60 * 1000);

    return result;
  }

  static async getEmailById(userId: string, id: string) {
    const cacheKey = cacheService.emailKey(userId, id);
    const cached = cacheService.get(cacheKey);

    if (cached) return cached;

    const email = await prisma.email.findFirst({
      where: { userId, id },
    });

    if (email) {
      cacheService.set(cacheKey, email, 10 * 60 * 1000);
    }

    return email;
  }

  static async markAsRead(userId: string, id: string) {
    const result = await prisma.email.updateMany({
      where: { userId, id },
      data: { isRead: true },
    });

    if (result.count > 0) {
      cacheService.delete(cacheService.emailKey(userId, id));
      cacheService.delete(cacheService.statsKey(userId));

      cacheService.invalidateUserCache(userId);

      try {
        const { getWebSocketService } = await import("./websocket.service");
        const wsService = getWebSocketService();
        if (wsService.isUserConnected(userId)) {
          wsService.notifyEmailRead(userId, id);
        }
      } catch (error) {
        console.log("WebSocket service not available:", error);
      }
    }

    return result;
  }

  static async getUserEmailStats(userId: string) {
    const cacheKey = cacheService.statsKey(userId);
    const cached = cacheService.get(cacheKey);

    if (cached) return cached;

    const [total, unread, withAttachments, categorized, syncState] =
      await Promise.all([
        prisma.email.count({ where: { userId } }),
        prisma.email.count({ where: { userId, isRead: false } }),
        prisma.email.count({ where: { userId, hasAttachments: true } }),
        prisma.email.count({ where: { userId, category: { not: null } } }),
        prisma.syncState.findUnique({ where: { userId } }),
      ]);

    const stats = {
      total,
      unread,
      withAttachments,
      categorized,
      uncategorized: total - categorized,
      lastSyncAt: syncState?.lastSyncAt,
      syncInProgress: syncState?.syncInProgress || false,
    };

    cacheService.set(cacheKey, stats, 60 * 1000);

    return stats;
  }

  static async getSyncStatus(userId: string) {
    const cacheKey = cacheService.syncStatusKey(userId);
    const cached = cacheService.get(cacheKey);

    if (cached) return cached;

    const syncState = await prisma.syncState.findUnique({
      where: { userId },
    });

    if (!syncState) {
      const status = {
        syncInProgress: false,
        isInitialSyncing: true,
        lastSyncAt: null,
        emailCount: 0,
      };

      cacheService.set(cacheKey, status, 30 * 1000); 
      return status;
    }

    const emailCount = await prisma.email.count({ where: { userId } });

    const status = {
      syncInProgress: syncState.syncInProgress,
      isInitialSyncing: syncState.isInitialSyncing,
      lastSyncAt: syncState.lastSyncAt,
      emailCount,
    };

    const ttl = syncState.syncInProgress ? 30 * 1000 : 5 * 60 * 1000;
    cacheService.set(cacheKey, status, ttl);

    return status;
  }

  static async getRecentEmails(userId: string, limit: number = 20) {
    const cacheKey = cacheService.recentEmailsKey(userId, limit);
    const cached = cacheService.get(cacheKey);

    if (cached) return cached;

    const emails = await prisma.email.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit,
      select: {
        id: true,
        subject: true,
        from: true,
        snippet: true,
        isRead: true,
        date: true,
        hasAttachments: true,
        category: true,
        avatarUrl: true,
      },
    });

    cacheService.set(cacheKey, emails, 2 * 60 * 1000);

    return emails;
  }
}
