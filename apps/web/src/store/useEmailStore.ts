import { create } from "zustand";
import { Email, EmailFolder, EmailStats } from "@/types/email";
import { fetchEmailById, fetchEmails, fetchEmailStats, markEmailAsRead } from "@/api/email";

interface EmailStore {
  emails: Email[];
  selectedEmail: Email | null;
  activeFolder: EmailFolder;
  loading: boolean;
  error: string | null;
  stats: EmailStats | null;
  page: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;

  loadEmails: () => Promise<void>;
  loadEmailById: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  setActiveFolder: (folder: EmailFolder) => void;
  setPage: (page: number) => void;
  loadStats: () => Promise<void>;
  clearError: () => void;
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: [],
  selectedEmail: null,
  activeFolder: "inbox",
  loading: false,
  error: null,
  stats: null,
  page: 1,
  totalPages: 1,
  totalCount: 0,
  hasMore: false,

  loadEmails: async () => {
    const { activeFolder, page } = get();
    set({ loading: true, error: null });

    try {
      const response = await fetchEmails({
        page,
        folder: activeFolder,
        limit: 20,
      });

      console.log("Loaded emails:", response.emails);

      set({
        emails: response.emails,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load emails:", error);
      set({
        error: "Failed to load emails",
        loading: false,
      });
    }
  },

  loadEmailById: async (id: string) => {
    try {
      const email = await fetchEmailById(id);
      console.log("Loaded email body:", email);
      set({ selectedEmail: email });
    } catch (error) {
      console.error("Failed to load email:", error);
      set({ error: "Failed to load email" });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await markEmailAsRead(id);
      const { emails } = get();
      const updatedEmails = emails.map((email) =>
        email.id === id ? { ...email, isRead: true } : email
      );
      set({ emails: updatedEmails });
    } catch (error) {
      console.error("Failed to mark email as read:", error);
    }
  },

  setActiveFolder: (folder: EmailFolder) => {
    set({
      activeFolder: folder,
      page: 1,
      selectedEmail: null,
    });
    get().loadEmails();
  },

  setPage: (page: number) => {
    set({ page });
    get().loadEmails();
  },

  loadStats: async () => {
    try {
      const stats = await fetchEmailStats();
      set({ stats });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
