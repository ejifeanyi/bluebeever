import { Response } from 'express';
import { createSuccessResponse, createErrorResponse, SyncStrategy } from '@crate/shared';
import { ERROR_CODES } from '@crate/shared';
import { AuthenticatedRequest } from '@/middleware/auth';
import { EmailSyncService } from '@/services/email-sync.service';
import { EmailQueryService } from '@/services/email-query.service';
import { EmailCategoryService } from '@/services/email-category.service';
import { prisma } from '@/config/database';

export class EmailController {
  static async quickSync(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const syncStrategy = SyncStrategy?.QUICK || 'quick';
      
      const result = await EmailSyncService.initiateSync(req.user.userId, syncStrategy as any);
      res.json(createSuccessResponse(result, 'Quick sync initiated - recent emails loading'));
    } catch (error) {
      console.error('Quick sync error:', error);
      return EmailController.handleSyncError(error, res);
    }
  }

  static async fullSync(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const syncStrategy = SyncStrategy?.FULL || 'full';
      
      const result = await EmailSyncService.initiateSync(req.user.userId, syncStrategy as any);
      res.json(createSuccessResponse(result, 'Full sync initiated - importing all emails in background'));
    } catch (error) {
      console.error('Full sync error:', error);
      return EmailController.handleSyncError(error, res);
    }
  }

  static async incrementalSync(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const syncStrategy = SyncStrategy?.INCREMENTAL || 'incremental';
      
      const result = await EmailSyncService.initiateSync(req.user.userId, syncStrategy as any);
      res.json(createSuccessResponse(result, 'Incremental sync initiated'));
    } catch (error) {
      console.error('Incremental sync error:', error);
      return EmailController.handleSyncError(error, res);
    }
  }

  static async resetSync(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const result = await EmailSyncService.resetSyncState(req.user.userId);
      res.json(createSuccessResponse(result, 'Sync state reset successfully'));
    } catch (error) {
      console.error('Reset sync error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to reset sync state')
      );
    }
  }

  static async getSyncStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const status = await EmailQueryService.getSyncStatus(req.user.userId);
      res.json(createSuccessResponse(status));
    } catch (error) {
      console.error('Get sync status error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to get sync status')
      );
    }
  }

  static async getEmails(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const search = req.query.search as string;
      const category = req.query.category as string;
      
      const filters = {
        isRead: req.query.isRead ? req.query.isRead === 'true' : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        labels: req.query.labels ? (req.query.labels as string).split(',') : undefined,
        category,
      };

      const result = await EmailQueryService.getUserEmails(
        req.user.userId,
        page,
        limit,
        search,
        filters
      );

      res.json(createSuccessResponse(result));
    } catch (error) {
      console.error('Get emails error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch emails')
      );
    }
  }

  static async getEmail(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const { id } = req.params;
      const email = await EmailQueryService.getEmailById(req.user.userId, id);
      
      if (!email) {
        return res.status(404).json(
          createErrorResponse(ERROR_CODES.NOT_FOUND, 'Email not found')
        );
      }

      res.json(createSuccessResponse(email));
    } catch (error) {
      console.error('Get email error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch email')
      );
    }
  }

  static async markEmailAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const { id } = req.params;
      const result = await EmailQueryService.markAsRead(req.user.userId, id);
      
      if (result.count === 0) {
        return res.status(404).json(
          createErrorResponse(ERROR_CODES.NOT_FOUND, 'Email not found')
        );
      }

      res.json(createSuccessResponse(null, 'Email marked as read'));
    } catch (error) {
      console.error('Mark email as read error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to mark email as read')
      );
    }
  }

  static async updateEmailCategory(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const { id } = req.params;
      const { category } = req.body;

      if (!category || typeof category !== 'string') {
        return res.status(400).json(
          createErrorResponse(ERROR_CODES.VALIDATION_ERROR, 'Category is required')
        );
      }

      const result = await EmailCategoryService.updateEmailCategory(
        req.user.userId,
        id,
        category
      );

      if (!result) {
        return res.status(404).json(
          createErrorResponse(ERROR_CODES.NOT_FOUND, 'Email not found')
        );
      }

      res.json(createSuccessResponse(result, 'Email category updated'));
    } catch (error) {
      console.error('Update email category error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to update email category')
      );
    }
  }

  static async searchEmails(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }
      const { subject, from, to, category, label, dateFrom, dateTo, isRead, q } = req.query;
      const filters: any = {
        userId: req.user.userId,
        ...(subject && { subject: { contains: subject, mode: 'insensitive' } }),
        ...(from && { from: { contains: from, mode: 'insensitive' } }),
        ...(to && { to: { has: to } }),
        ...(category && { category }),
        ...(label && { labels: { has: label } }),
        ...(isRead !== undefined && { isRead: isRead === 'true' }),
        ...(dateFrom && { date: { gte: new Date(dateFrom as string) } }),
        ...(dateTo && { date: { lte: new Date(dateTo as string) } }),
      };

      if (q) {
        filters.OR = [
          { subject: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
          { snippet: { contains: q, mode: 'insensitive' } },
        ];
      }

      const emails = await prisma.email.findMany({
        where: filters,
        orderBy: { date: 'desc' },
        take: 50, // limit results
      });

      res.json(emails);
    } catch (error) {
      res.status(500).json({ error: 'Search failed', details: error });
    }
  }

  static async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const categories = await EmailCategoryService.getUserCategories(req.user.userId);
      res.json(createSuccessResponse(categories));
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch categories')
      );
    }
  }

  static async getEmailStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const stats = await EmailQueryService.getUserEmailStats(req.user.userId);
      res.json(createSuccessResponse(stats));
    } catch (error) {
      console.error('Get email stats error:', error);
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch email stats')
      );
    }
  }

  private static handleSyncError(error: unknown, res: Response) {
    if (error instanceof Error) {
      if (error.message === 'Sync already in progress for this user') {
        return res.status(409).json(
          createErrorResponse(ERROR_CODES.INTERNAL_ERROR, error.message)
        );
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return res.status(429).json(
          createErrorResponse(ERROR_CODES.GMAIL_API_ERROR, 'Gmail API rate limit exceeded')
        );
      }
    }

    res.status(500).json(
      createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to initiate email sync')
    );
  }
}