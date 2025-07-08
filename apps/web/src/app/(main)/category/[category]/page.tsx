"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmailStore } from "@/store/useEmailStore";
import MailPage from "@/components/mail/MailPage";
import EmailViewer from "@/components/mail/EmailViewer";

const CategoryPage = () => {
  const params = useParams();
  const router = useRouter();
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
    router.push(`/category/${encodeURIComponent(categoryName)}/${emailId}`);
  };

  const handleBackToList = () => {
    setSelectedEmailId(null);
    router.push(`/category/${encodeURIComponent(categoryName)}`);
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
