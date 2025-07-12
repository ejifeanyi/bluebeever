import { prisma } from "@/config/database";

interface EmailFilters {
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  labels?: string[];
  category?: string;
}

interface PaginatedEmailsResult {
  emails: any[];
  nextPageEmails?: any[]; // Predictive loading
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

    // **PREDICTIVE LOADING**: Fetch current page + next page in one query
    const extendedLimit = limit * 2; // Get 2x emails to include next page
    const [allEmails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { date: "desc" }, // **SMART PRIORITIZATION**: Most recent first
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

    // Split results: current page vs next page
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

    // **PREDICTIVE LOADING**: Include next page data if available
    if (nextPageEmails.length > 0 && hasNextPage) {
      result.nextPageEmails = nextPageEmails;
    }

    return result;
  }

  static async getEmailById(userId: string, id: string) {
    return prisma.email.findFirst({
      where: { userId, id },
    });
  }

  static async markAsRead(userId: string, id: string) {
    const result = await prisma.email.updateMany({
      where: { userId, id },
      data: { isRead: true },
    });

    // **REAL-TIME UPDATES**: Notify WebSocket service
    if (result.count > 0) {
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
    const [total, unread, withAttachments, categorized, syncState] =
      await Promise.all([
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

  /**
   * **SMART PRIORITIZATION**: Get recent emails first for quick loading
   */
  static async getRecentEmails(userId: string, limit: number = 20) {
    return prisma.email.findMany({
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
  }
}
