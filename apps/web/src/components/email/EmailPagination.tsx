import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore } from "@/store/useEmailStore";

export function EmailPagination() {
  const { page, totalPages, totalCount, hasMore, setPage, loading } =
    useEmailStore();

  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push("...");
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push("...");
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
      <div className="text-sm text-muted-foreground">
        Showing {Math.min((page - 1) * 20 + 1, totalCount)} to{" "}
        {Math.min(page * 20, totalCount)} of {totalCount} emails
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={page === 1 || loading}
          className={cn(
            "flex items-center px-3 py-1 rounded-md text-sm transition-colors",
            page === 1 || loading
              ? "text-muted-foreground cursor-not-allowed"
              : "text-foreground hover:bg-accent"
          )}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </button>

        <div className="flex items-center space-x-1">
          {getPageNumbers().map((pageNum, index) => (
            <button
              key={index}
              onClick={() => typeof pageNum === "number" && setPage(pageNum)}
              disabled={loading || pageNum === "..."}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors",
                pageNum === page
                  ? "bg-primary text-primary-foreground"
                  : pageNum === "..."
                    ? "text-muted-foreground cursor-default"
                    : "text-foreground hover:bg-accent"
              )}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={page === totalPages || loading || !hasMore}
          className={cn(
            "flex items-center px-3 py-1 rounded-md text-sm transition-colors",
            page === totalPages || loading || !hasMore
              ? "text-muted-foreground cursor-not-allowed"
              : "text-foreground hover:bg-accent"
          )}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
