import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSyncStore } from "@/store/useSyncStore";
import { Mail, RefreshCw, X } from "lucide-react";
import SyncProgress from "./SyncProgress";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  autoStart?: boolean;
}

const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  autoStart = false,
}) => {
  const {
    status,
    loading,
    error,
    startQuickSync,
    startForcedSync,
    clearError,
    stopPolling,
  } = useSyncStore();

  useEffect(() => {
    if (isOpen && autoStart && !status?.isActive) {
      startQuickSync();
    }
  }, [isOpen, autoStart, status?.isActive, startQuickSync]);

  useEffect(() => {
    if (status?.stage === "completed") {
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  }, [status?.stage, onComplete]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleClose = () => {
    if (status?.isActive) {
      stopPolling();
    }
    onClose();
  };

  const canClose =
    !status?.isActive ||
    status?.stage === "completed" ||
    status?.stage === "error";

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? handleClose : undefined}>
      <DialogContent className="sm:max-w-md" showCloseButton={canClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-accent-foreground">
            <Mail className="h-5 w-5" />
            Email Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!status && !loading && !error && (
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                Choose how you'd like to sync your emails
              </div>
              <div className="space-y-2">
                <Button
                  onClick={startQuickSync}
                  className="w-full"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Quick Sync (Recent emails)
                </Button>
                <Button
                  onClick={startForcedSync}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Full Sync (All emails)
                </Button>
              </div>
            </div>
          )}

          {status && <SyncProgress status={status} />}

          {error && (
            <div className="text-center space-y-4">
              <div className="text-red-600 text-sm">{error}</div>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    clearError();
                    startQuickSync();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  className="w-full"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {canClose && (
            <div className="flex justify-end">
              <Button onClick={handleClose} variant="ghost" size="sm" className="text-accent-foreground cursor-pointer">
                <X className="h-4 w-4 mr-2 text-accent-foreground" />
                {status?.stage === "completed" ? "Done" : "Close"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncModal;
