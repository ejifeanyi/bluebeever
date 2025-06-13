import { prisma } from '@/config/database';

export class EmailQueryService {
  static async getUserEmails(
    userId: string,
    page = 1,
    limit = 50,
    search?: string,
    filters?: {
      isRead?: boolean;
      hasAttachments?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
      labels?: string[];
    }
  ) {
    const offset = (page - 1) * limit;
    const where: any = { userId };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
        { snippet: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters) {
      if (filters.isRead !== undefined) {
        where.isRead = filters.isRead;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      if (filters.labels && filters.labels.length > 0) {
        where.labels = {
          hasSome: filters.labels,
        };
      }
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          subject: true,
          from: true,
          snippet: true,
          date: true,
          isRead: true,
          labels: true,
          attachments: true,
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

  static async getUserEmailStats(userId: string) {
    const [total, unread, today] = await Promise.all([
      prisma.email.count({ where: { userId } }),
      prisma.email.count({ where: { userId, isRead: false } }),
      prisma.email.count({
        where: {
          userId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return { total, unread, today };
  }
}