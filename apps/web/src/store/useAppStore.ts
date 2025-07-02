import { create } from "zustand";
import * as authApi from "@/api/auth";

interface AuthState {
  user: any;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async () => {
    set({ loading: true, error: null });
    try {
      const data = await authApi.getMe();
      set({ user: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false, user: null });
    }
  },
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      await authApi.refreshToken();
      const data = await authApi.getMe();
      set({ user: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false, user: null });
    }
  },
  logout: () => {
    authApi.logout();
    set({ user: null });
  },
}));
