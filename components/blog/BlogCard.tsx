import Link from "next/link";
import type { ProductImage } from "@/lib/shopify/types";

export interface BlogPost {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  image?: ProductImage | null;
}

export function BlogCard({ slug, date, title, excerpt, image }: BlogPost) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="group flex flex-col bg-white shadow-sm hover:shadow-md transition-shadow duration-200 h-full"
    >
      {/* Image with inset padding */}
      <div className="p-3 pb-0 shrink-0">
        <div className="overflow-hidden bg-gray-100 aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image?.url ?? "/images/pills_on_hands.png"}
            alt={image?.altText ?? title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Content — flex-1 so all cards stretch to same height */}
      <div className="px-5 pt-4 pb-5 flex flex-col flex-1 gap-2">
        <p className="text-teal-500 text-[12px] font-semibold tracking-[0.6px] uppercase shrink-0">
          {date}
        </p>
        <h2 className="text-navy-900 text-[15px] font-bold leading-[1.4] line-clamp-2 group-hover:text-teal-500 transition-colors shrink-0">
          {title}
        </h2>
        {/* Excerpt fills remaining space so Read more stays at bottom */}
        <p className="text-gray-500 text-[14px] leading-[1.5] line-clamp-2 flex-1">
          {excerpt || " "}
        </p>
        <span className="text-teal-500 text-[13px] font-semibold tracking-[0.26px] shrink-0">
          Read more →
        </span>
      </div>
    </Link>
  );
}
