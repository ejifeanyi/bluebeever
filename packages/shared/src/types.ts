import { z } from "zod";

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
  avatarUrl: z.string().url().optional(),
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
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        attachmentId: z.string(),
      })
    )
    .optional(),
  category: z.string().optional(),
  categoryConfidence: z.number().optional(),
  categoryDescription: z.string().optional(),
  categorizedAt: z.date().optional(),
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

export const UpdateEmailCategorySchema = z.object({
  category: z.string().min(1).max(50),
});

export enum SyncStrategy {
  QUICK = "quick",
  FULL = "full",
  INCREMENTAL = "incremental",
}

export const EmailSyncJobSchema = z.object({
  userId: z.string(),
  maxResults: z.number().optional(),
  pageToken: z.string().optional(),
  isInitialSync: z.boolean().optional().default(false),
  strategy: z.nativeEnum(SyncStrategy),
});

export const EmailProcessingJobSchema = z.object({
  emailId: z.string(),
  userId: z.string(),
  emailData: z
    .object({
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
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            mimeType: z.string(),
            size: z.number(),
            attachmentId: z.string(),
          })
        )
        .optional(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .optional(),
});

export const ParsedEmailSchema = z.object({
  id: z.string().optional(),
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
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        attachmentId: z.string(),
      })
    )
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export enum ERROR_CODES {
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  GMAIL_API_ERROR = "GMAIL_API_ERROR",
}

export const createSuccessResponse = <T>(data?: T, message?: string) => ({
  success: true,
  data,
  message,
});

export const createErrorResponse = (code: ERROR_CODES, message: string) => ({
  success: false,
  error: code,
  message,
});

export type SyncStrategyType = "quick" | "full" | "incremental";
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type SyncEmails = z.infer<typeof SyncEmailsSchema>;
export type EmailSyncJob = z.infer<typeof EmailSyncJobSchema>;
export type EmailProcessingJob = z.infer<typeof EmailProcessingJobSchema>;
export type ParsedEmail = z.infer<typeof ParsedEmailSchema>;
export type UpdateEmailCategory = z.infer<typeof UpdateEmailCategorySchema>;
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
