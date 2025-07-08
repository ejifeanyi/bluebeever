import Cookies from "js-cookie";
import {
  Email,
  EmailListResponse,
  EmailFilters,
  EmailFolder,
  EmailStats,
  Category,
} from "@/types/email";

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
  signal,
}: {
  page?: number;
  limit?: number;
  folder?: EmailFolder;
  search?: string;
  filters?: EmailFilters;
  signal?: AbortSignal;
}): Promise<EmailListResponse> {
  const params = new URLSearchParams();

  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (search) params.append("search", search);
  if (filters?.isRead !== undefined)
    params.append("isRead", filters.isRead.toString());
  if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.append("dateTo", filters.dateTo);
  if (filters?.labels?.length)
    params.append("labels", filters.labels.join(","));
  if (filters?.category) params.append("category", filters.category);

  const url = `${API_URL}/emails?${params.toString()}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    signal,
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

export async function fetchEmailsByCategory({
  category,
  page = 1,
  limit = 20,
  search,
  filters,
  signal,
}: {
  category: string;
  page?: number;
  limit?: number;
  search?: string;
  filters?: Omit<EmailFilters, "category">;
  signal?: AbortSignal;
}): Promise<EmailListResponse> {
  const params = new URLSearchParams();

  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (search) params.append("search", search);
  if (filters?.isRead !== undefined)
    params.append("isRead", filters.isRead.toString());
  if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.append("dateTo", filters.dateTo);
  if (filters?.labels?.length)
    params.append("labels", filters.labels.join(","));

  const encodedCategory = encodeURIComponent(category);
  const url = `${API_URL}/emails/category/${encodedCategory}?${params.toString()}`;

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        signal,
      });

      if (!response.ok) {
        if (response.status >= 500 && retries > 1) {
          console.warn(
            `Server error (${response.status}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          retries--;
          continue;
        }

        console.error("Response failed:");
        console.error("Status:", response.status);
        console.error("Status Text:", response.statusText);
        console.error("URL:", url);
        console.error("Category:", category);

        throw new Error(
          `HTTP ${response.status}: Failed to fetch emails for category: ${category}`
        );
      }

      const data = await response.json();
      console.log(`Fetched emails for category ${category}:`, data);

      return {
        emails: data.data?.emails || [],
        page: data.data?.page || page,
        totalPages: data.data?.totalPages || 1,
        totalCount: data.data?.totalCount || 0,
        hasMore: data.data?.hasMore || false,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw error;
      }

      if (retries > 1) {
        console.warn(`Network error, retrying in ${delay}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Failed to fetch emails for category: ${category} after retries`
  );
}

function filterEmailsByFolder(emails: Email[], folder: EmailFolder): Email[] {
  switch (folder) {
    case "inbox":
      return emails.filter(
        (email) =>
          email.labels.includes("INBOX") &&
          !email.labels.includes("SPAM") &&
          !email.labels.includes("TRASH")
      );
    case "sent":
      return emails.filter((email) => email.labels.includes("SENT"));
    case "drafts":
      return emails.filter((email) => email.labels.includes("DRAFT"));
    case "spam":
      return emails.filter((email) => email.labels.includes("SPAM"));
    case "trash":
      return emails.filter((email) => email.labels.includes("TRASH"));
    case "archive":
      return emails.filter(
        (email) =>
          !email.labels.includes("INBOX") &&
          !email.labels.includes("SPAM") &&
          !email.labels.includes("TRASH") &&
          !email.labels.includes("SENT") &&
          !email.labels.includes("DRAFT")
      );
    case "favorites":
      return emails.filter((email) => email.labels.includes("STARRED"));
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
  console.log("data mail: ", data);
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

export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/emails/categories`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch email categories");
  }

  const data = await response.json();

  return data.data || [];
}

export async function updateEmailCategory(
  id: string,
  category: string
): Promise<Email> {
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

  const response = await fetch(
    `${API_URL}/emails/search?${params.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to search emails");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data || [];
}
