"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEmailStore } from "@/store/useEmailStore";
import { EmailList } from "@/components/email/EmailList";
import { EmailView } from "@/components/email/EmailView";
import { EmailFolder } from "@/types/email";
import { X } from "lucide-react";

interface MailPageProps {
  folder: EmailFolder;
}

const MailPage = ({ folder }: MailPageProps) => {
  const { selectedEmail, activeFolder, setActiveFolder, loadEmails } =
    useEmailStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (activeFolder !== folder) {
      setActiveFolder(folder);
      loadEmails();
    }
  }, [folder, activeFolder, setActiveFolder, loadEmails]);

  const handleCloseEmail = () => {
    useEmailStore.setState({ selectedEmail: null });
  };

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
    <div className="flex h-full">
      <div
        className={`${selectedEmail ? "w-1/2" : "w-full"} border-r border-border transition-all duration-300`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold">{getFolderTitle(folder)}</h1>
        </div>
        <EmailList />
      </div>

      {selectedEmail && (
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Email Details</h2>
            <button
              onClick={handleCloseEmail}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <EmailView email={selectedEmail} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MailPage;
