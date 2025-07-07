"use client";

import { useEffect, useState } from "react";
import { useEmailStore } from "@/store/useEmailStore";
import { Email, EmailAttachment } from "@/types/email";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailViewerProps {
  emailId: string | null;
  onBack: () => void;
}

const EmailViewer = ({ emailId, onBack }: EmailViewerProps) => {
  const { selectedEmail, loadEmailById, markAsRead } = useEmailStore();
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (emailId) {
      loadEmailById(emailId);
      markAsRead(emailId);
    }
  }, [emailId, loadEmailById, markAsRead]);

  if (!emailId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No email selected</h3>
          <p className="text-sm">Select an email to view its contents</p>
        </div>
      </div>
    );
  }

  if (!selectedEmail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isThreaded = Array.isArray(selectedEmail.body);
  const emails: Email[] = isThreaded
    ? (selectedEmail.body as Email[])
    : [selectedEmail];

  const toggleEmailExpansion = (emailId: string) => {
    setExpandedEmails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatEmailBody = (body: string) => {
    return body
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^-+$/gm, '<hr class="my-4 border-gray-300">')
      .replace(/https?:\/\/[^\s]+/g, (url) => {
        const decodedUrl = decodeURIComponent(url);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${decodedUrl.length > 60 ? decodedUrl.substring(0, 60) + "..." : decodedUrl}</a>`;
      })
      .replace(/\n/g, "<br>");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 ">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4 text-accent-foreground" />
          </Button>
          <h2 className="text-lg font-semibold max-w-md text-accent-foreground">
            {selectedEmail.subject}
          </h2>
          {isThreaded && (
            <Badge
              variant="secondary"
              className="text-xs text-accent-foreground"
            >
              {emails.length} messages
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Star className="h-4 w-4 text-accent-foreground" />
          </Button>
          <Button variant="ghost" size="sm">
            <Archive className="h-4 w-4 text-accent-foreground" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4 text-accent-foreground" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="sm">
            <Reply className="h-4 w-4 text-accent-foreground" />
          </Button>
          <Button variant="ghost" size="sm">
            <ReplyAll className="h-4 w-4 text-accent-foreground" />
          </Button>
          <Button variant="ghost" size="sm">
            <Forward className="h-4 w-4 text-accent-foreground" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {emails.map((email: Email, index: number) => {
            const isExpanded =
              expandedEmails.has(email.id) || index === emails.length - 1;
            const isLastEmail = index === emails.length - 1;

            return (
              <div
                key={email.id}
                className={cn(
                  "border rounded-lg",
                  isExpanded ? "border-border" : "border-border/50"
                )}
              >
                <div
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    isExpanded
                      ? "bg-background"
                      : "bg-muted/20 hover:bg-muted/40"
                  )}
                  onClick={() => !isLastEmail && toggleEmailExpansion(email.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {email.from.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {email.from}
                            </span>
                            {email.labels.includes("STARRED") && (
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            to:{" "}
                            {Array.isArray(email.to)
                              ? email.to.join(", ")
                              : email.to}
                          </div>
                        </div>
                      </div>

                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground truncate">
                          {email.snippet}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(email.date)}
                      </span>
                      {!isLastEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <Separator className="mb-4" />

                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {email.attachments.length} attachment(s)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {email.attachments.map(
                            (attachment: EmailAttachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md"
                              >
                                <span className="text-sm truncate max-w-32">
                                  {attachment.filename}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <div className="prose prose-sm max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatEmailBody(
                            typeof email.body === "string"
                              ? email.body
                              : email.snippet
                          ),
                        }}
                        className="text-sm leading-relaxed text-accent-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default EmailViewer;
