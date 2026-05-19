"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const visiblePages = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  const withEllipsis: (number | "…")[] = [];
  for (let i = 0; i < visiblePages.length; i++) {
    if (i > 0 && visiblePages[i] - visiblePages[i - 1] > 1) {
      withEllipsis.push("…");
    }
    withEllipsis.push(visiblePages[i]);
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center text-navy-900 disabled:opacity-30 hover:text-teal-500 transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft size={18} />
      </button>

      {withEllipsis.map((item, i) =>
        item === "…" ? (
          <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-gray-500 text-[15px] select-none">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item as number)}
            className={`w-10 h-10 flex items-center justify-center text-[15px] font-medium transition-colors rounded-full ${
              currentPage === item
                ? "bg-navy-900 text-white"
                : "text-navy-900 hover:text-teal-500"
            }`}
            aria-current={currentPage === item ? "page" : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center text-navy-900 disabled:opacity-30 hover:text-teal-500 transition-colors"
        aria-label="Next page"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
