import { Email } from "@/types/email";
import { formatDistanceToNow } from "date-fns";
import { Star, Paperclip, Reply, Forward, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailViewProps {
  email: Email;
}

export function EmailView({ email }: EmailViewProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown date";
    }
  };

  const getSenderName = (from: string) => {
    const match = from.match(/^(.+?)\s*<.*>$/);
    return match ? match[1].trim() : from;
  };

  const getSenderEmail = (from: string) => {
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
  };

  const hasAttachments = email.attachments && email.attachments.length > 0;
  const isStarred = email.labels.includes("STARRED");

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/50 p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold mb-2 text-foreground">
              {email.subject || "(No subject)"}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {getSenderName(email.from)}
              </span>
              <span>&lt;{getSenderEmail(email.from)}&gt;</span>
              <span>•</span>
              <span>{formatDate(email.date)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              className={cn(
                "p-2 rounded-md hover:bg-accent transition-colors",
                isStarred && "text-yellow-500"
              )}
            >
              <Star className={cn("h-4 w-4", isStarred && "fill-yellow-500")} />
            </button>
            <button className="p-2 rounded-md hover:bg-accent transition-colors">
              <Reply className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-md hover:bg-accent transition-colors">
              <Forward className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-md hover:bg-accent transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {email.to && email.to.length > 0 && (
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">To: </span>
            {email.to.join(", ")}
          </div>
        )}

        {hasAttachments && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <Paperclip className="h-4 w-4" />
            <span>{email.attachments!.length} attachment(s)</span>
          </div>
        )}

        {email.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {email.labels
              .filter(
                (label) =>
                  !["INBOX", "SENT", "DRAFT", "SPAM", "TRASH"].includes(label)
              )
              .map((label) => (
                <span
                  key={label}
                  className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground"
                >
                  {label}
                </span>
              ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-sm max-w-none">
          {email.body ? (
            <div
              dangerouslySetInnerHTML={{ __html: email.body }}
              className="text-foreground"
            />
          ) : (
            <p className="text-muted-foreground italic">
              {email.snippet || "No content available"}
            </p>
          )}
        </div>
      </div>

      {hasAttachments && (
        <div className="border-t border-border/50 p-4">
          <h3 className="font-medium mb-3 text-foreground">Attachments</h3>
          <div className="space-y-2">
            {email.attachments!.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.mimeType} •{" "}
                      {Math.round(attachment.size / 1024)} KB
                    </p>
                  </div>
                </div>
                <button className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
