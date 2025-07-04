export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  body: string;
  snippet: string;
  isRead: boolean;
  labels: string[];
  attachments?: EmailAttachment[];
  category?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string;
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

export interface EmailStats {
  inboxCount: number;
  favoritesCount: number;
  sentCount: number;
  draftsCount: number;
  spamCount: number;
  archiveCount: number;
  trashCount: number;
  unreadCount: number;
}

export type EmailFolder =
  | "inbox"
  | "sent"
  | "drafts"
  | "spam"
  | "trash"
  | "archive"
  | "favorites";
