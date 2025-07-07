"use client";

import { useState } from "react";
import MailPage from "@/components/mail/MailPage";
import EmailViewer from "@/components/mail/EmailViewer";

export default function InboxPage() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  const handleBackToList = () => {
    setSelectedEmailId(null);
  };

  return (
    <div className="flex h-full w-full gap-5">
      <MailPage
        folder="inbox"
        onEmailSelect={handleEmailSelect}
        selectedEmailId={selectedEmailId}
      />
      <div className="flex-1 overflow-y-scroll">
        <EmailViewer emailId={selectedEmailId} onBack={handleBackToList} />
      </div>
    </div>
  );
}
