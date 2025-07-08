"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmailStore } from "@/store/useEmailStore";
import MailPage from "@/components/mail/MailPage";
import EmailViewer from "@/components/mail/EmailViewer";

const CategoryEmailDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const categoryName = decodeURIComponent(params.category as string);
  const emailId = params.emailId as string;
  const { setActiveCategory, activeCategory, loadEmails, setActiveFolder } =
    useEmailStore();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(
    emailId
  );

  useEffect(() => {
    if (categoryName && activeCategory !== categoryName) {
      setActiveCategory(categoryName);
      setActiveFolder(null);
      loadEmails();
    }
  }, [
    categoryName,
    activeCategory,
    setActiveCategory,
    setActiveFolder,
    loadEmails,
  ]);

  useEffect(() => {
    if (emailId) {
      setSelectedEmailId(emailId);
    }
  }, [emailId]);

  const handleEmailSelect = (newEmailId: string) => {
    setSelectedEmailId(newEmailId);
    router.push(`/category/${encodeURIComponent(categoryName)}/${newEmailId}`);
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

export default CategoryEmailDetailPage;
