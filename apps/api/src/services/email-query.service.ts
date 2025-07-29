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
    const cached = await cacheService.get<PaginatedEmailsResult>(cacheKey);

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

    if (filters?.isRead !== undefined) where.isRead = filters.isRead;
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = filters.dateFrom;
      if (filters.dateTo) where.date.lte = filters.dateTo;
    }
    if (filters?.labels?.length) where.labels = { hasSome: filters.labels };
    if (filters?.category) where.category = filters.category;

    const extendedLimit = Math.min(limit * 2, 100);

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
          processingStatus: true,
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

    await cacheService.set(cacheKey, result, 2 * 60 * 1000);
    return result;
  }

  static async getEmailById(userId: string, id: string): Promise<any | null> {
    const cacheKey = cacheService.emailKey(userId, id);
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const email = await prisma.email.findFirst({
      where: { userId, id },
    });

    if (email) {
      await cacheService.set(cacheKey, email, 10 * 60 * 1000);
    }

    return email;
  }

  static async markAsRead(userId: string, id: string) {
    const result = await prisma.email.updateMany({
      where: { userId, id },
      data: { isRead: true },
    });

    if (result.count > 0) {
      await Promise.all([
        cacheService.delete(cacheService.emailKey(userId, id)),
        cacheService.delete(cacheService.statsKey(userId)),
      ]);

      cacheService.invalidateUserCache(userId);

      this.notifyEmailRead(userId, id);
    }

    return result;
  }

  static async getUserEmailStats(userId: string) {
    const cacheKey = cacheService.statsKey(userId);
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const [total, unread, withAttachments, categorized, processing, syncState] =
      await Promise.all([
        prisma.email.count({ where: { userId } }),
        prisma.email.count({ where: { userId, isRead: false } }),
        prisma.email.count({ where: { userId, hasAttachments: true } }),
        prisma.email.count({ where: { userId, category: { not: null } } }),
        prisma.email.count({
          where: { userId, processingStatus: "processing" },
        }),
        prisma.syncState.findUnique({ where: { userId } }),
      ]);

    const stats = {
      total,
      unread,
      withAttachments,
      categorized,
      uncategorized: total - categorized,
      processing,
      lastSyncAt: syncState?.lastSyncAt,
      syncInProgress: syncState?.syncInProgress || false,
    };

    await cacheService.set(cacheKey, stats, 60 * 1000);
    return stats;
  }

  private static async notifyEmailRead(userId: string, emailId: string) {
    try {
      const { getWebSocketService } = await import("./websocket.service");
      const wsService = getWebSocketService();
      if (wsService.isUserConnected(userId)) {
        wsService.notifyEmailRead(userId, emailId);
      }
    } catch (error) {
      console.debug("WebSocket notification failed:", error);
    }
  }
}
