import { Request, Response } from 'express';
import { createSuccessResponse, createErrorResponse } from '@crate/shared';
import { ERROR_CODES } from '@crate/shared';
import { AuthenticatedRequest } from '@/middleware/auth';
import { EmailSyncService } from '@/services/email-sync.service';
import { EmailQueryService } from '@/services/email-query.service';

export class EmailController {
  static async syncEmails(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json(
          createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'User not authenticated')
        );
      }

      const maxResults = parseInt(req.query.maxResults as string) || 100;
      
      if (maxResults > 500) {
        return res.status(400).json(
          createErrorResponse(ERROR_CODES.VALIDATION_ERROR, 'maxResults cannot exceed 500')
        );
      }

      const result = await EmailSyncService.initiateSync(req.user.userId, maxResults);
      
      res.json(createSuccessResponse(result, 'Email sync initiated'));
    } catch (error) {
      console.error('Email sync error:', error);
      
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
      
      const filters = {
        isRead: req.query.isRead ? req.query.isRead === 'true' : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        labels: req.query.labels ? (req.query.labels as string).split(',') : undefined,
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
}
