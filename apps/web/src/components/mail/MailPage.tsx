"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEmailStore } from "@/store/useEmailStore";
import { EmailList } from "@/components/email/EmailList";
import { EmailFolder } from "@/types/email";

interface MailPageProps {
  folder: EmailFolder;
}

const MailPage = ({ folder }: MailPageProps) => {
  const {
    activeFolder,
    setActiveFolder,
    loadEmails,
    emails,
    totalCount,
  } = useEmailStore();

  const unreadCount = emails.filter((email) => !email.isRead).length;

  useEffect(() => {
    if (activeFolder !== folder) {
      setActiveFolder(folder);
      loadEmails();
    }
  }, [folder, activeFolder, setActiveFolder, loadEmails]);

  const getFolderTitle = (folder: EmailFolder) => {
    const titles: Record<EmailFolder, string> = {
      inbox: "Inbox",
      favorites: "Favorites",
      sent: "Sent",
      drafts: "Drafts",
      spam: "Spam",
      archive: "Archive",
      trash: "Trash",
    };
    return titles[folder] || folder;
  };

  return (
    <div className="h-full w-130 flex flex-col border border-accent px-6 py-7 rounded-4xl overflow-y-auto">
      <div className="flex items-baseline mb-3 gap-3">
        <h1 className="text-2xl font-bold text-accent-foreground">
          {getFolderTitle(folder)}
        </h1>
        <span className="text-accent-foreground/50 text-xs">
          ({totalCount} Messages, {unreadCount} Unread)
        </span>
      </div>
      <EmailList />
    </div>
  );
};

export default MailPage;
