import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { createErrorResponse } from '@crate/shared';
import { ERROR_CODES } from '@crate/shared';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json(
        createErrorResponse(ERROR_CODES.UNAUTHORIZED, 'Missing or invalid authorization header')
      );
      return;
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    
    next();
  } catch (error) {
    res.status(401).json(
      createErrorResponse(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired token')
    );
  }
};