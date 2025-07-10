import React from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { SyncStatus } from "@/api/sync";

interface SyncProgressProps {
  status: SyncStatus;
  className?: string;
}

const SyncProgress: React.FC<SyncProgressProps> = ({ status, className }) => {
  const getStageText = () => {
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
        return "Sync failed";
      default:
        return "Syncing...";
    }
  };

  const getStageIcon = () => {
    switch (status.stage) {
      case "initializing":
      case "syncing":
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Mail className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const isActive =
    status.isActive && status.stage !== "completed" && status.stage !== "error";

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {getStageIcon()}
            <div className="flex-1">
              <h3 className="font-medium text-sm">{getStageText()}</h3>
              {status.error && (
                <p className="text-sm text-red-600 mt-1">{status.error}</p>
              )}
            </div>
          </div>

          {isActive && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(status.progress)}%</span>
                </div>
                <Progress value={status.progress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Processed</p>
                  <p className="font-medium">
                    {status.processedEmails.toLocaleString()} /{" "}
                    {status.totalEmails.toLocaleString()}
                  </p>
                </div>
                {status.estimatedTimeRemaining > 0 && (
                  <div>
                    <p className="text-muted-foreground">Time remaining</p>
                    <p className="font-medium">
                      {formatTime(status.estimatedTimeRemaining)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {status.stage === "completed" && (
            <div className="text-sm text-green-600">
              Successfully synced {status.processedEmails.toLocaleString()}{" "}
              emails
            </div>
          )}

          {status.lastSyncAt && (
            <div className="text-xs text-muted-foreground">
              Last sync: {new Date(status.lastSyncAt).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncProgress;
