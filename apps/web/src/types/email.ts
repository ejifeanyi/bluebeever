export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  snippet: string;
  body?: string;
  isRead: boolean;
  labels: string[];
  category?: string;
  userId: string;
  gmailId: string;
  threadId: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: EmailAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface EmailListResponse {
  emails: Email[];
  page: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

export interface EmailFilters {
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
  labels?: string[];
  category?: string;
}

export type EmailFolder =
  | "inbox"
  | "sent"
  | "drafts"
  | "spam"
  | "trash"
  | "archive"
  | "favorites";

export interface EmailStats {
  totalEmails: number;
  unreadCount: number;
  inboxCount: number;
  sentCount: number;
  draftsCount: number;
  spamCount: number;
  trashCount: number;
  archiveCount: number;
  favoritesCount: number;
}
