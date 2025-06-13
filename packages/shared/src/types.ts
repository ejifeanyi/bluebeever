import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  picture: z.string().url().optional(),
  googleId: z.string(),
  refreshToken: z.string().optional(),
  accessToken: z.string().optional(),
  tokenExpiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  picture: z.string().url().optional(),
  googleId: z.string(),
  refreshToken: z.string(),
  accessToken: z.string(),
  tokenExpiresAt: z.date(),
});

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.string(),
});

export const EmailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  threadId: z.string(),
  messageId: z.string(),
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  body: z.string(),
  snippet: z.string(),
  isRead: z.boolean(),
  date: z.date(),
  labels: z.array(z.string()),
  attachments: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    attachmentId: z.string(),
  })).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SyncEmailsSchema = z.object({
  userId: z.string(),
  pageToken: z.string().optional(),
  maxResults: z.number().min(1).max(500).default(100),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type SyncEmails = z.infer<typeof SyncEmailsSchema>;
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};