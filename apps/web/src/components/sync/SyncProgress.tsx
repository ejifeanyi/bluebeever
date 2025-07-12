import { SyncStatus } from "@/api/sync";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface SyncProgressProps {
  status: SyncStatus;
}

const SyncProgress = ({ status }: SyncProgressProps) => {
  const getIcon = () => {
    switch (status.stage) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (status.stage) {
      case "initializing":
        return "Initializing sync...";
      case "syncing":
        return "Syncing emails...";
      case "processing":
        return "Processing emails...";
      case "completed":
        return "Sync completed!";
      case "error":
        return status.error || "Sync failed";
      default:
        return "Syncing...";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1">
          <div className="text-sm font-medium">{getStatusText()}</div>
          {status.totalEmails > 0 && (
            <div className="text-xs text-muted-foreground">
              {status.processedEmails} of {status.totalEmails} emails
            </div>
          )}
        </div>
      </div>

      {status.isActive && status.totalEmails > 0 && (
        <Progress value={status.progress} className="w-full" />
      )}

      {status.estimatedTimeRemaining > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Estimated time remaining:{" "}
          {Math.ceil(status.estimatedTimeRemaining / 60)}m
        </div>
      )}
    </div>
  );
};

export default SyncProgress;
