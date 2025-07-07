import Cookies from "js-cookie";
import { Email, EmailListResponse, EmailFilters, EmailFolder, EmailStats } from "@/types/email";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const getAuthHeaders = () => {
  const token = Cookies.get("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export async function fetchEmails({
  page = 1,
  limit = 20,
  folder,
  search,
  filters,
}: {
  page?: number;
  limit?: number;
  folder?: EmailFolder;
  search?: string;
  filters?: EmailFilters;
}): Promise<EmailListResponse> {
  const params = new URLSearchParams();
  
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  
  if (search) params.append("search", search);
  if (filters?.isRead !== undefined) params.append("isRead", filters.isRead.toString());
  if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.append("dateTo", filters.dateTo);
  if (filters?.labels?.length) params.append("labels", filters.labels.join(","));
  if (filters?.category) params.append("category", filters.category);

  const url = `${API_URL}/emails?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch emails");
  }
  
  const data = await response.json();

  console.log("Fetched emails:", data);
  
  let filteredEmails = data.data?.emails || [];
  
  if (folder) {
    filteredEmails = filterEmailsByFolder(filteredEmails, folder);
  }
  
  const totalCount = filteredEmails.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);
  
  return {
    emails: paginatedEmails,
    page,
    totalPages,
    totalCount,
    hasMore: page < totalPages,
  };
}

function filterEmailsByFolder(emails: Email[], folder: EmailFolder): Email[] {
  switch (folder) {
    case "inbox":
      return emails.filter(email => 
        email.labels.includes("INBOX") && 
        !email.labels.includes("SPAM") && 
        !email.labels.includes("TRASH")
      );
    case "sent":
      return emails.filter(email => email.labels.includes("SENT"));
    case "drafts":
      return emails.filter(email => email.labels.includes("DRAFT"));
    case "spam":
      return emails.filter(email => email.labels.includes("SPAM"));
    case "trash":
      return emails.filter(email => email.labels.includes("TRASH"));
    case "archive":
      return emails.filter(email => 
        !email.labels.includes("INBOX") && 
        !email.labels.includes("SPAM") && 
        !email.labels.includes("TRASH") &&
        !email.labels.includes("SENT") &&
        !email.labels.includes("DRAFT")
      );
    case "favorites":
      return emails.filter(email => email.labels.includes("STARRED"));
    default:
      return emails;
  }
}

export async function fetchEmailById(id: string): Promise<Email> {
  const response = await fetch(`${API_URL}/emails/${id}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch email");
  }
  
  const data = await response.json();
  console.log("data mail: ", data)
  return data.data;
}

export async function markEmailAsRead(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/emails/${id}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to mark email as read");
  }
}

export async function updateEmailCategory(id: string, category: string): Promise<Email> {
  const response = await fetch(`${API_URL}/emails/${id}/category`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ category }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update email category");
  }
  
  const data = await response.json();
  return data.data;
}

export async function fetchEmailStats(): Promise<EmailStats> {
  const response = await fetch(`${API_URL}/emails/stats`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch email stats");
  }
  
  const data = await response.json();
  return data.data;
}

export async function searchEmails(query: string): Promise<Email[]> {
  const params = new URLSearchParams();
  params.append("q", query);
  
  const response = await fetch(`${API_URL}/emails/search?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to search emails");
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data : data.data || [];
}