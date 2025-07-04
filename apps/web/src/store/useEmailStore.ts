import { create } from "zustand";
import { Email, EmailFilters, EmailFolder, EmailStats } from "@/types/email";
import {
  fetchEmails,
  fetchEmailById,
  markEmailAsRead,
  fetchEmailStats,
} from "@/api/email";

interface EmailState {
  emails: Email[];
  currentEmail: Email | null;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
  activeFolder: EmailFolder;
  searchQuery: string;
  filters: EmailFilters;
  stats: EmailStats | null;

  setActiveFolder: (folder: EmailFolder) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: EmailFilters) => void;
  setPage: (page: number) => void;
  loadEmails: (page?: number) => Promise<void>;
  loadEmailById: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  loadStats: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  emails: [],
  currentEmail: null,
  loading: false,
  error: null,
  page: 1,
  totalPages: 1,
  totalCount: 0,
  hasMore: false,
  activeFolder: "inbox",
  searchQuery: "",
  filters: {},
  stats: null,

  setActiveFolder: (folder) => {
    set({ activeFolder: folder, page: 1, emails: [] });
    get().loadEmails();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1, emails: [] });
    get().loadEmails();
  },

  setFilters: (filters) => {
    set({ filters, page: 1, emails: [] });
    get().loadEmails();
  },

  setPage: (page) => {
    set({ page });
    get().loadEmails(page);
  },

  loadEmails: async (page = 1) => {
    const { activeFolder, searchQuery, filters } = get();

    set({ loading: true, error: null });

    try {
      const response = await fetchEmails({
        page,
        limit: 20,
        folder: activeFolder,
        search: searchQuery || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      set({
        emails: response.emails,
        page: response.page,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load emails",
        loading: false,
      });
    }
  },

  loadEmailById: async (id) => {
    set({ loading: true, error: null });

    try {
      const email = await fetchEmailById(id);
      set({ currentEmail: email, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load email",
        loading: false,
      });
    }
  },

  markAsRead: async (id) => {
    try {
      await markEmailAsRead(id);

      const { emails } = get();
      const updatedEmails = emails.map((email) =>
        email.id === id ? { ...email, isRead: true } : email
      );

      set({ emails: updatedEmails });

      if (get().currentEmail?.id === id) {
        set({ currentEmail: { ...get().currentEmail!, isRead: true } });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark email as read",
      });
    }
  },

  loadStats: async () => {
    try {
      const stats = await fetchEmailStats();
      set({ stats });
    } catch (error) {
      console.error("Failed to load email stats:", error);
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      emails: [],
      currentEmail: null,
      loading: false,
      error: null,
      page: 1,
      totalPages: 1,
      totalCount: 0,
      hasMore: false,
      activeFolder: "inbox",
      searchQuery: "",
      filters: {},
      stats: null,
    }),
}));
