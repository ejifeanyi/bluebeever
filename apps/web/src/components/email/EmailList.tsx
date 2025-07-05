import { useEffect } from "react";
import { useEmailStore } from "@/store/useEmailStore";
import { Loader2 } from "lucide-react";
import { EmailItem } from "./EmailItem";
import { EmailPagination } from "./EmailPagination";

export function EmailList() {
  const { emails, loading, error, activeFolder, loadEmails, clearError } =
    useEmailStore();

  useEffect(() => {
    loadEmails();
  }, []);

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={clearError}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          No emails found in {activeFolder}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y space-y-7 mt-5">
          {emails.map((email) => (
            <EmailItem key={email.id} email={email} />
          ))}
        </div>
      </div>

      <EmailPagination />
    </div>
  );
}
