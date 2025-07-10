import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const getAuthHeaders = () => {
  const token = Cookies.get("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export interface SyncStatus {
  isActive: boolean;
  progress: number;
  stage: "initializing" | "syncing" | "processing" | "completed" | "error";
  totalEmails: number;
  processedEmails: number;
  estimatedTimeRemaining: number;
  lastSyncAt: string | null;
  error: string | null;
}

export async function initiateQuickSync(): Promise<void> {
  const response = await fetch(`${API_URL}/emails/sync/quick`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to initiate quick sync");
  }
}

export async function initiateForcedSync(): Promise<void> {
  const response = await fetch(`${API_URL}/emails/sync/full`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to initiate full sync");
  }
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const response = await fetch(`${API_URL}/emails/sync/status`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to get sync status");
  }

  const data = await response.json();
  return data.data;
}

export async function resetSync(): Promise<void> {
  const response = await fetch(`${API_URL}/emails/sync/reset`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to reset sync");
  }
}
