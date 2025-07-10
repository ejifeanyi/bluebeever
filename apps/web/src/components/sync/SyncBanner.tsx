import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSyncStore } from "@/store/useSyncStore";
import { Loader2, CheckCircle, AlertCircle, RefreshCw, X } from "lucide-react";

const SyncBanner: React.FC = () => {
  const { status, startQuickSync, stopPolling } = useSyncStore();

  if (!status?.isActive && status?.stage !== "completed") {
    return null;
  }

  const getIcon = () => {
    switch (status.stage) {
      case "initializing":
      case "syncing":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getMessage = () => {
    switch (status.stage) {
      case "initializing":
        return "Initializing email sync...";
      case "syncing":
        return `Syncing emails... ${status.processedEmails}/${status.totalEmails}`;
      case "processing":
        return "Processing synced emails...";
      case "completed":
        return `Successfully synced ${status.processedEmails.toLocaleString()} emails`;
      case "error":
        return status.error || "Sync failed";
      default:
        return "Syncing...";
    }
  };

  const isActive =
    status.isActive && status.stage !== "completed" && status.stage !== "error";

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <div className="flex items-center gap-3 w-full">
        {getIcon()}
        <div className="flex-1 space-y-1">
          <AlertDescription className="text-sm font-medium">
            {getMessage()}
          </AlertDescription>
          {isActive && status.progress > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={status.progress} className="h-1 flex-1" />
              <span className="text-xs text-muted-foreground">
                {Math.round(status.progress)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status.stage === "error" && (
            <Button onClick={startQuickSync} size="sm" variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {!isActive && (
            <Button onClick={stopPolling} size="sm" variant="ghost">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default SyncBanner;
