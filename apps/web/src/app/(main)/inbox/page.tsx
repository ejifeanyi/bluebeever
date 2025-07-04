"use client";

import { useEffect } from "react";
import { useEmailStore } from "@/store/useEmailStore";

const FILTER_LABELS: Record<string, string> = {
  inbox: "Inbox",
  favorites: "Favorites",
  drafts: "Drafts",
  sent: "Sent",
  spam: "Spam",
  trash: "Trash",
};

const InboxPage = () => {
  const {
    emails,
    loading,
    error,
    page,
    totalPages,
    filter,
    setFilter,
    fetchEmails,
  } = useEmailStore();

  useEffect(() => {
    fetchEmails(page, filter);
    // eslint-disable-next-line
  }, [page, filter]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchEmails(newPage, filter);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{FILTER_LABELS[filter]}</h2>
        <div className="flex gap-2">
          {Object.keys(FILTER_LABELS).map((key) => (
            <button
              key={key}
              className={`px-3 py-1 rounded ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              } transition`}
              onClick={() => setFilter(key as any)}
              disabled={filter === key}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div className="text-muted-foreground">Loading emails...</div>
      )}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && emails.length === 0 && (
        <div className="text-muted-foreground">No emails found.</div>
      )}
      <ul className="divide-y divide-border bg-card rounded-lg shadow">
        {emails.map((email) => (
          <li key={email.id} className="p-4 hover:bg-accent/30 transition">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{email.subject}</div>
                <div className="text-sm text-muted-foreground">
                  {email.snippet}
                </div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(email.date).toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From: {email.from}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center mt-6">
        <button
          className="px-4 py-2 rounded bg-accent text-foreground disabled:opacity-50"
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1 || loading}
        >
          Previous
        </button>
        <span className="text-sm">
          Page {page} of {totalPages}
        </span>
        <button
          className="px-4 py-2 rounded bg-accent text-foreground disabled:opacity-50"
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default InboxPage;
