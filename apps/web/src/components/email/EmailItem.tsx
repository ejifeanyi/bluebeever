import { useEmailStore } from "@/store/useEmailStore";
import { Email } from "@/types/email";
import { EllipsisVertical, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  formatDate,
  getSenderName,
  getSenderNameInitials,
  truncateText,
} from "@/utils";
import { Button } from "../ui/button";
import CategoryModal from "../modal/CategoryModal";
import { useState } from "react";

interface EmailItemProps {
  email: Email;
  onEmailSelect?: (emailId: string) => void;
  selectedEmailId?: string | null;
}

export function EmailItem({
  email,
  onEmailSelect,
  selectedEmailId,
}: EmailItemProps) {
  const { markAsRead, loadEmailById } = useEmailStore();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const categories = email.labels || [];

  const handleSelectCategory = (category: string) => {
    setIsCategoryModalOpen(false);
  };

  const handleCreateCategory = (category: string) => {
    setIsCategoryModalOpen(false);
  };

  const handleClick = async () => {
    if (!email.isRead) {
      await markAsRead(email.id);
    }
    await loadEmailById(email.id);

    if (onEmailSelect) {
      onEmailSelect(email.id);
    }
  };

  const isStarred = email.labels.includes("STARRED");
  const isSelected = selectedEmailId === email.id;

  return (
    <div
      className={cn(
        "flex flex-col space-y-3 rounded-md py-3 px-3 cursor-pointer transition-colors ease-in-out shadow-none",
        !email.isRead ? "bg-background font-medium" : "",
        isSelected ? "bg-primary/10" : "hover:bg-accent/50"
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
            <AvatarFallback className="text-accent-foreground">
              {getSenderNameInitials(email.from)}
            </AvatarFallback>
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
          <span className="text-xs text-accent-foreground/20 text-right">
            {formatDate(email.date)}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3 justify-between w-full pl-11">
        <span
          className={`text-sm ${email.isRead ? "text-accent-foreground/70" : "text-accent-foreground"}`}
        >
          {truncateText(email.snippet, 90)}
        </span>
        <div className="flex items-center justify-end space-x-2">
          <Star
            className={`h-4 w-4 ${isStarred ? "text-yellow-400" : "text-accent-foreground/50"}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-accent-foreground/50 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsCategoryModalOpen(true);
            }}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSelectCategory={handleSelectCategory}
        currentCategory={email.category}
        categories={categories}
        onCreateCategory={handleCreateCategory}
      />
    </div>
  );
}
