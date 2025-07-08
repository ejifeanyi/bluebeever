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
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getSenderName, getSenderNameInitials } from "@/utils";

interface EmailViewerProps {
  emailId: string | null;
  onBack: () => void;
}

const EmailViewer = ({ emailId, onBack }: EmailViewerProps) => {
  const { selectedEmail, loadEmailById, markAsRead } = useEmailStore();
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(
    new Set()
  );

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

  const handleImageError = (src: string) => {
    setImageLoadErrors((prev) => new Set(prev).add(src));
  };

  const formatEmailBody = (body: string) => {
    // Clean up the body text and remove excessive whitespace
    let cleanBody = body
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Extract and format images
    const imageRegex =
      /https?:\/\/[^\s"'>]+\.(?:png|jpg|jpeg|gif|svg|webp)(?:\@2x)?(?:\?[^\s"'>]*)?/gi;
    const images = cleanBody.match(imageRegex) || [];

    // Extract and format links (excluding images)
    const linkRegex = /https?:\/\/[^\s"'>]+(?!\.(png|jpg|jpeg|gif|svg|webp))/gi;

    // Replace images with proper img tags
    cleanBody = cleanBody.replace(imageRegex, (imageUrl) => {
      const cleanUrl = imageUrl.replace(/['">\s]+$/, "");
      return `<img src="${cleanUrl}" alt="Email Image" class="email-image" data-url="${cleanUrl}" style="max-width: 100%; height: auto; margin: 16px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="image-placeholder" style="display: none; align-items: center; gap: 8px; padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0; color: #6b7280;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg><span>Image could not be loaded</span></div>`;
    });

    // Format links with better styling
    cleanBody = cleanBody.replace(linkRegex, (url) => {
      const cleanUrl = url.replace(/['">\s]+$/, "");
      const decodedUrl = decodeURIComponent(cleanUrl);
      let displayUrl = decodedUrl;

      // Shorten very long URLs
      if (displayUrl.length > 80) {
        displayUrl = displayUrl.substring(0, 80) + "...";
      }

      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="email-link" style="color: #2563eb; text-decoration: underline; word-break: break-word; display: inline-flex; align-items: center; gap: 4px; margin: 2px 0;">${displayUrl}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
    });

    // Format headers and important text
    cleanBody = cleanBody.replace(
      /^([A-Z][A-Za-z\s]+)$/gm,
      '<h3 style="font-size: 18px; font-weight: 600; margin: 24px 0 12px 0; color: #1f2937;">$1</h3>'
    );

    // Format separators
    cleanBody = cleanBody.replace(
      /^-+$/gm,
      '<hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">'
    );

    // Convert line breaks to proper spacing
    cleanBody = cleanBody.replace(
      /\n\n/g,
      "<div style='margin: 16px 0;'></div>"
    );
    cleanBody = cleanBody.replace(/\n/g, "<br>");

    return cleanBody;
  };

  const extractEmailSubject = (body: string) => {
    // Try to extract a subject or title from the email body
    const lines = body.split("\n").filter((line) => line.trim());
    const potentialSubject = lines.find(
      (line) =>
        line.length > 10 &&
        line.length < 100 &&
        !line.includes("http") &&
        !line.includes("@")
    );
    return potentialSubject || selectedEmail.subject || "Email Content";
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={selectedEmail.avatarUrl}
              alt={getSenderName(selectedEmail.from)}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-white">
              {getSenderNameInitials(selectedEmail.from)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900">
              {getSenderName(selectedEmail.from)}
            </span>
            <p className="text-xs text-gray-600">
              {formatDate(selectedEmail.date)}
              <span className="text-xs text-gray-400 ml-2">
                {selectedEmail.from}
              </span>
            </p>
          </div>

          {isThreaded && (
            <Badge variant="secondary" className="text-xs">
              {emails.length} messages
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Star className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Reply className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Forward className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {emails.map((email: Email, index: number) => {
            const isExpanded =
              expandedEmails.has(email.id) || index === emails.length - 1;
            const isLastEmail = index === emails.length - 1;

            return (
              <div
                key={email.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    isExpanded ? "bg-white" : "bg-gray-50 hover:bg-gray-100"
                  )}
                  onClick={() => !isLastEmail && toggleEmailExpansion(email.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">
                        {extractEmailSubject(
                          typeof email.body === "string"
                            ? email.body
                            : email.snippet
                        )}
                      </h2>
                      {!isExpanded && (
                        <p className="text-sm text-gray-600 truncate">
                          {email.snippet}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
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
                  <div className="px-6 pb-6">
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {email.attachments.length} attachment(s)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {email.attachments.map(
                            (attachment: EmailAttachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md"
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
                        className="text-sm leading-relaxed text-gray-800 email-content"
                        style={{
                          lineHeight: "1.6",
                          fontSize: "14px",
                          color: "#374151",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <style jsx>{`
        .email-content img {
          max-width: 100%;
          height: auto;
          margin: 16px 0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .email-content a {
          color: #2563eb;
          text-decoration: underline;
          word-break: break-word;
        }

        .email-content a:hover {
          color: #1d4ed8;
        }

        .image-placeholder {
          display: none;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: #f3f4f6;
          border-radius: 8px;
          margin: 16px 0;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default EmailViewer;
