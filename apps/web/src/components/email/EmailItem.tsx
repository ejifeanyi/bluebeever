import { useEmailStore } from "@/store/useEmailStore";
import { Email } from "@/types/email";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  formatDate,
  getSenderName,
  getSenderNameInitials,
  truncateText,
} from "@/utils";

interface EmailItemProps {
  email: Email;
}

export function EmailItem({ email }: EmailItemProps) {
  const { markAsRead, loadEmailById } = useEmailStore();

  const handleClick = async () => {
    if (!email.isRead) {
      await markAsRead(email.id);
    }
    await loadEmailById(email.id);
  };

  const isStarred = email.labels.includes("STARRED");

  return (
    <div
      className={cn(
        "flex flex-col space-y-3 rounded-md py-2 px-3 cursor-pointer transition-colors ease-in-out",
        !email.isRead ? "bg-background font-medium" : "",
        "hover:bg-accent/50"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between space-x-3 w-full">
        <div className="flex items-center space-x-2 flex-1">
          <Avatar>
            <AvatarImage
              src={email.avatarUrl}
              alt={getSenderName(email.from)}
              className="object-cover"
            />
            <AvatarFallback>{getSenderNameInitials(email.from)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1">
            <span className="text-accent-foreground text-sm font-medium">
              {getSenderName(email.from)}
            </span>
            <span className="text-accent-foreground/70 text-xs font-medium">
              {truncateText(email.subject, 50)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <span className="text-xs text-accent-foreground/50 text-right">
            {formatDate(email.date)}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3 justify-between w-full pl-11">
        <span
          className={`text-sm ${email.isRead ? "text-accent-foreground/70" : "text-accent-foreground"}`}
        >
          {truncateText(email.snippet, 100)}
        </span>
        <div className="flex items-center justify-end space-x-2">
          <Star
            className={`h-4 w-4 ${isStarred ? "text-yellow-400" : "text-accent-foreground/50"}`}
          />
        </div>
      </div>

      <div>{/* TODO: add categories */}</div>
    </div>
  );
}
