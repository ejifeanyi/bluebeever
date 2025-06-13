import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createErrorResponse } from '@crate/shared';
import { ERROR_CODES } from '@crate/shared';
import { env } from '@/config/env';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  if (error instanceof ZodError) {
    res.status(400).json(
      createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      )
    );
    return;
  }

  if (error.name === 'JsonWebTokenError') {
    res.status(401).json(
      createErrorResponse(ERROR_CODES.INVALID_TOKEN, 'Invalid token')
    );
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json(
      createErrorResponse(ERROR_CODES.TOKEN_EXPIRED, 'Token expired')
    );
    return;
  }

  const isDevelopment = env.NODE_ENV === 'development';
  
  res.status(500).json(
    createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      isDevelopment ? error.message : 'Internal server error'
    )
  );
};