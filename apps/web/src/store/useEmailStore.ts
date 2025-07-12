import { create } from "zustand";
import { Category, Email, EmailFolder, EmailStats } from "@/types/email";
import {
  fetchEmailById,
  fetchEmails,
  fetchEmailsByCategory,
  fetchEmailStats,
  markEmailAsRead,
  fetchCategories,
  updateEmailCategory,
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
  
  // Predictive loading cache
  nextPageCache: Email[] | null;
  isLoadingNextPage: boolean;

  loadEmails: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadEmailById: (id: string) => Promise<void>;
  loadEmailsByCategory: (category: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  updateEmailCategory: (id: string, category: string) => Promise<void>;
  setActiveFolder: (folder: EmailFolder) => void;
  setActiveCategory: (category: string | null) => void;
  setPage: (page: number) => void;
  loadStats: () => Promise<void>;
  clearError: () => void;
  
  // Predictive loading methods
  preloadNextPage: () => Promise<void>;
  getNextPageFromCache: () => Email[] | null;
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
  nextPageCache: null,
  isLoadingNextPage: false,

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
      nextPageCache: null, // Clear cache on new load
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

      set({
        emails: response.emails,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        loading: false,
        abortController: null,
      });

      // Preload next page if available
      if (response.hasMore && page < response.totalPages) {
        get().preloadNextPage();
      }
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

  preloadNextPage: async () => {
    const { activeFolder, activeCategory, page, isLoadingNextPage, totalPages } = get();
    
    if (isLoadingNextPage || page >= totalPages) return;

    set({ isLoadingNextPage: true });

    try {
      const nextPage = page + 1;
      let response;

      if (activeCategory) {
        response = await fetchEmailsByCategory({
          category: activeCategory,
          page: nextPage,
          limit: 20,
        });
      } else {
        response = await fetchEmails({
          page: nextPage,
          folder: activeFolder,
          limit: 20,
        });
      }

      set({
        nextPageCache: response.emails,
        isLoadingNextPage: false,
      });
    } catch (error) {
      console.error("Failed to preload next page:", error);
      set({ isLoadingNextPage: false });
    }
  },

  getNextPageFromCache: () => {
    const { nextPageCache } = get();
    return nextPageCache;
  },

  setPage: (page: number) => {
    const { nextPageCache } = get();
    
    // If we're going to the next page and have cached data, use it
    if (page === get().page + 1 && nextPageCache) {
      set({
        page,
        emails: nextPageCache,
        nextPageCache: null,
      });
      
      // Preload the next page after this one
      get().preloadNextPage();
    } else {
      set({ page });
      get().loadEmails();
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
      nextPageCache: null,
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

      // Preload next page
      if (response.hasMore) {
        get().preloadNextPage();
      }
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

  updateEmailCategory: async (id: string, category: string) => {
    try {
      const updatedEmail = await updateEmailCategory(id, category);
      const { emails, selectedEmail } = get();
      
      const updatedEmails = emails.map((email) =>
        email.id === id ? { ...email, category } : email
      );
      
      set({ 
        emails: updatedEmails,
        selectedEmail: selectedEmail?.id === id 
          ? { ...selectedEmail, category } 
          : selectedEmail
      });
    } catch (error) {
      console.error("Failed to update email category:", error);
      set({ error: "Failed to update email category" });
      throw error;
    }
  },

  setActiveFolder: (folder: EmailFolder) => {
    set({
      activeFolder: folder,
      activeCategory: null,
      page: 1,
      selectedEmail: null,
      nextPageCache: null,
    });
    get().loadEmails();
  },

  setActiveCategory: (category: string | null) => {
    set({
      activeCategory: category,
      activeFolder: "inbox",
      page: 1,
      selectedEmail: null,
      nextPageCache: null,
    });

    if (category) {
      get().loadEmailsByCategory(category);
    } else {
      get().loadEmails();
    }
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