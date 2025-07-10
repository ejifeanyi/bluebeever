import { useEffect } from "react";
import { useSyncStore } from "@/store/useSyncStore";

export const useSyncPolling = (enabled: boolean = true) => {
  const { status, startPolling, stopPolling, checkStatus } = useSyncStore();

  useEffect(() => {
    if (enabled) {
      checkStatus();

      if (
        status?.isActive &&
        status.stage !== "completed" &&
        status.stage !== "error"
      ) {
        startPolling();
      }
    }

    return () => {
      if (enabled) {
        stopPolling();
      }
    };
  }, [
    enabled,
    status?.isActive,
    status?.stage,
    startPolling,
    stopPolling,
    checkStatus,
  ]);

  return {
    isActive: status?.isActive,
    stage: status?.stage,
    progress: status?.progress || 0,
    error: status?.error,
  };
};
