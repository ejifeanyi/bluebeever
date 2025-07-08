import { create } from "zustand";
import { Category, Email, EmailFolder, EmailStats } from "@/types/email";
import {
  fetchEmailById,
  fetchEmails,
  fetchEmailsByCategory,
  fetchEmailStats,
  markEmailAsRead,
  fetchCategories,
} from "@/api/email";

interface EmailStore {
  emails: Email[];
  categories: Category[];
  selectedEmail: Email | null;
  activeFolder: EmailFolder;
  activeCategory: string | null;
  loading: boolean;
  error: string | null;
  stats: EmailStats | null;
  page: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
  abortController: AbortController | null;

  loadEmails: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadEmailById: (id: string) => Promise<void>;
  loadEmailsByCategory: (category: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  setActiveFolder: (folder: EmailFolder) => void;
  setActiveCategory: (category: string | null) => void;
  setPage: (page: number) => void;
  loadStats: () => Promise<void>;
  clearError: () => void;
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: [],
  categories: [],
  selectedEmail: null,
  activeFolder: "inbox",
  activeCategory: null,
  loading: false,
  error: null,
  stats: null,
  page: 1,
  totalPages: 1,
  totalCount: 0,
  hasMore: false,
  abortController: null,

  loadEmails: async () => {
    const { activeFolder, activeCategory, page } = get();

    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    set({
      loading: true,
      error: null,
      abortController: newAbortController,
    });

    try {
      let response;

      if (activeCategory) {
        response = await fetchEmailsByCategory({
          category: activeCategory,
          page,
          limit: 20,
          signal: newAbortController.signal,
        });
      } else {
        response = await fetchEmails({
          page,
          folder: activeFolder,
          limit: 20,
          signal: newAbortController.signal,
        });
      }

      if (newAbortController.signal.aborted) {
        return;
      }

      console.log("Loaded emails:", response.emails);

      set({
        emails: response.emails,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        loading: false,
        abortController: null,
      });
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }

      console.error("Failed to load emails:", error);
      set({
        error: "Failed to load emails",
        loading: false,
        abortController: null,
      });
    }
  },

  loadEmailsByCategory: async (category: string) => {
    const { page } = get();

    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    set({
      loading: true,
      error: null,
      abortController: newAbortController,
    });

    try {
      const response = await fetchEmailsByCategory({
        category,
        page,
        limit: 20,
        signal: newAbortController.signal,
      });

      if (newAbortController.signal.aborted) {
        return;
      }

      console.log(`Loaded emails for category ${category}:`, response.emails);

      set({
        emails: response.emails,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        activeCategory: category,
        activeFolder: "inbox",
        loading: false,
        abortController: null,
      });
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }

      console.error(`Failed to load emails for category ${category}:`, error);
      set({
        error: `Failed to load emails for category: ${category}`,
        loading: false,
        abortController: null,
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

  loadCategories: async () => {
    try {
      const categories = await fetchCategories();
      set({ categories });
    } catch (error) {
      console.error("Failed to load categories:", error);
      set({ error: "Failed to load categories" });
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
      activeCategory: null,
      page: 1,
      selectedEmail: null,
    });
    get().loadEmails();
  },

  setActiveCategory: (category: string | null) => {
    set({
      activeCategory: category,
      activeFolder: "inbox",
      page: 1,
      selectedEmail: null,
    });

    if (category) {
      get().loadEmailsByCategory(category);
    } else {
      get().loadEmails();
    }
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
