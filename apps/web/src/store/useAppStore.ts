import { create } from "zustand";

interface FetchParams {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  token?: string;
  headers?: Record<string, string>;
}

interface AppState {
  data: any;
  loading: boolean;
  error: string | null;
  fetchData: (params: FetchParams) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  data: null,
  loading: false,
  error: null,
  fetchData: async ({
    url,
    method = "GET",
    body,
    token,
    headers = {},
  }: FetchParams) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      set({ data, loading: false });
    } catch (error: any) {
      set({ error: error.message || "Unknown error", loading: false });
    }
  },
}));
