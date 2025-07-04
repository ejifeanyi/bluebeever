"use client";

import { useEffect } from "react";
import { useEmailStore } from "@/store/useEmailStore";
import { EmailList } from "@/components/email/EmailList";
import { EmailView } from "@/components/email/EmailView";
import { X } from "lucide-react";

const InboxPage = () => {
  const { selectedEmail, activeFolder, setActiveFolder, loadEmails } =
    useEmailStore();

  useEffect(() => {
    setActiveFolder("inbox");
    loadEmails();
  }, []);

  const handleCloseEmail = () => {
    const { selectedEmail: _, ...store } = useEmailStore.getState();
    useEmailStore.setState({ selectedEmail: null });
  };

  return (
    <div className="flex h-full">
      <div
        className={`${selectedEmail ? "w-1/2" : "w-full"} border-r border-border transition-all duration-300`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold capitalize">{activeFolder}</h1>
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

export default InboxPage;
