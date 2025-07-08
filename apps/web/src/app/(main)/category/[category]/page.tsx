"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useEmailStore } from "@/store/useEmailStore";
import MailPage from "@/components/mail/MailPage";
import EmailViewer from "@/components/mail/EmailViewer";

const CategoryPage = () => {
  const params = useParams();
  const categoryName = decodeURIComponent(params.category as string);
  const { setActiveCategory, activeCategory, loadEmails } = useEmailStore();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  useEffect(() => {
    if (categoryName && activeCategory !== categoryName) {
      setActiveCategory(categoryName);
      loadEmails();
    }
  }, [categoryName, activeCategory, setActiveCategory, loadEmails]);

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
};

export default CategoryPage;
