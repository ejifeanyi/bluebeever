import { useState } from "react";
import { useEmailStore } from "@/store/useEmailStore";
import { Email } from "@/types/email";
import { formatDistanceToNow } from "date-fns";
import { Star, Paperclip, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailItemProps {
  email: Email;
}

export function EmailItem({ email }: EmailItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { markAsRead, loadEmailById } = useEmailStore();

  const handleClick = async () => {
    if (!email.isRead) {
      await markAsRead(email.id);
    }
    await loadEmailById(email.id);
  };

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

  const hasAttachments = email.attachments && email.attachments.length > 0;
  const isStarred = email.labels.includes("STARRED");

  return (
    <div
      className={cn(
        "flex items-center p-4 hover:bg-accent/50 cursor-pointer transition-colors border-b border-border/50",
        !email.isRead && "bg-background font-medium"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          {isStarred && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
          {hasAttachments && (
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          )}
          {!email.isRead && <div className="h-2 w-2 rounded-full bg-primary" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={cn(
                "text-sm truncate",
                email.isRead
                  ? "text-muted-foreground"
                  : "text-foreground font-medium"
              )}
            >
              {getSenderName(email.from)}
            </span>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(email.date)}</span>
            </div>
          </div>

          <div className="mb-1">
            <span
              className={cn(
                "text-sm truncate block",
                email.isRead ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {email.subject || "(No subject)"}
            </span>
          </div>

          <div className="text-xs text-muted-foreground truncate">
            {email.snippet}
          </div>
        </div>
      </div>

      {email.labels.length > 0 && (
        <div className="flex space-x-1 ml-4">
          {email.labels
            .filter(
              (label) =>
                !["INBOX", "SENT", "DRAFT", "SPAM", "TRASH"].includes(label)
            )
            .slice(0, 3)
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
  );
}
