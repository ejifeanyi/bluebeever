import { create } from "zustand";
import {
  SyncStatus,
  initiateQuickSync,
  getSyncStatus,
  initiateForcedSync,
  resetSync,
} from "@/api/sync";

interface SyncStore {
  status: SyncStatus | null;
  loading: boolean;
  error: string | null;
  pollInterval: NodeJS.Timeout | null;

  startQuickSync: () => Promise<void>;
  startForcedSync: () => Promise<void>;
  checkStatus: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  resetSyncState: () => Promise<void>;
  clearError: () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  status: null,
  loading: false,
  error: null,
  pollInterval: null,

  startQuickSync: async () => {
    set({ loading: true, error: null });
    try {
      await initiateQuickSync();
      get().startPolling();
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  startForcedSync: async () => {
    set({ loading: true, error: null });
    try {
      await initiateForcedSync();
      get().startPolling();
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  checkStatus: async () => {
    try {
      const status = await getSyncStatus();
      set({ status, loading: false });

      if (status.stage === "completed" || status.stage === "error") {
        get().stopPolling();
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      get().stopPolling();
    }
  },

  startPolling: () => {
    const { pollInterval } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    const interval = setInterval(() => {
      get().checkStatus();
    }, 2000);

    set({ pollInterval: interval });
    get().checkStatus();
  },

  stopPolling: () => {
    const { pollInterval } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
      set({ pollInterval: null });
    }
  },

  resetSyncState: async () => {
    try {
      await resetSync();
      set({ status: null, error: null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
