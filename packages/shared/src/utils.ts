import { ApiResponse } from './types';

export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
});

export const createSuccessResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => createApiResponse(true, data, undefined, message);

export const createErrorResponse = (
  error: string,
  message?: string
): ApiResponse => createApiResponse(false, undefined, error, message);

export const isTokenExpired = (expiresAt: Date): boolean => {
  return Date.now() >= expiresAt.getTime();
};

export const isTokenExpiringSoon = (expiresAt: Date, bufferMs = 300000): boolean => {
  return Date.now() >= (expiresAt.getTime() - bufferMs);
};