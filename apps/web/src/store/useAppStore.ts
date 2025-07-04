import { create } from "zustand";
import Cookies from "js-cookie";
import * as authApi from "@/api/auth";

interface AuthState {
  user: any;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async () => {
    const token = Cookies.get("token");
    if (!token) {
      set({ user: null, loading: false, error: "No token found" });
      return;
    }

    set({ loading: true, error: null });
    try {
      const data = await authApi.getMe();
      set({ user: data, loading: false });
    } catch (error: any) {
      if (error.message.includes("token") || error.message.includes("401")) {
        try {
          await get().refresh();
        } catch (refreshError: any) {
          authApi.logout();
          set({ error: refreshError.message, loading: false, user: null });
        }
      } else {
        set({ error: error.message, loading: false, user: null });
      }
    }
  },
  refresh: async () => {
    const refreshToken = Cookies.get("refreshToken");
    if (!refreshToken) {
      set({ error: "No refresh token", loading: false, user: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      await authApi.refreshToken();
      const data = await authApi.getMe();
      set({ user: data, loading: false });
    } catch (error: any) {
      authApi.logout();
      set({ error: error.message, loading: false, user: null });
    }
  },
  logout: () => {
    authApi.logout();
    set({ user: null, error: null });
  },
}));
