"use client";

import { useRef, useState } from "react";
import { FadeIn } from "@/components/ui/FadeIn";
import { BlogCard } from "./BlogCard";
import { Pagination } from "./Pagination";
import type { BlogArticleSummary } from "@/lib/shopify/types";

interface Props {
  articles: BlogArticleSummary[];
}

const POSTS_PER_PAGE = 9;

export function BlogGrid({ articles }: Props) {
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.ceil(articles.length / POSTS_PER_PAGE);
  const start = (page - 1) * POSTS_PER_PAGE;
  const visible = articles.slice(start, start + POSTS_PER_PAGE);

  function goToPage(p: number) {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={gridRef} className="flex flex-col gap-10">
      {/* key={page} remounts the grid so the reveal replays on page change */}
      <div
        key={page}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px] gap-y-[28px] items-stretch"
      >
        {visible.map((article, i) => (
          <FadeIn key={article.id} delay={i * 0.07} className="h-full">
            <BlogCard
              slug={article.handle}
              date={new Date(article.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              title={article.title}
              excerpt={article.excerpt ?? ""}
              image={article.image}
            />
          </FadeIn>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} />
      )}
    </div>
  );
}
