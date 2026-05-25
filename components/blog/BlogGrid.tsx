"use client";

import { useState } from "react";
import { BlogCard } from "./BlogCard";
import { Pagination } from "./Pagination";
import type { BlogArticleSummary } from "@/lib/shopify/types";

interface Props {
  articles: BlogArticleSummary[];
}

const POSTS_PER_PAGE = 9;

export function BlogGrid({ articles }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(articles.length / POSTS_PER_PAGE);
  const start = (page - 1) * POSTS_PER_PAGE;
  const visible = articles.slice(start, start + POSTS_PER_PAGE);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px] gap-y-0">
        {visible.map((article) => (
          <BlogCard
            key={article.id}
            slug={article.handle}
            date={new Date(article.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            title={article.title}
            excerpt={article.excerpt ?? ""}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
