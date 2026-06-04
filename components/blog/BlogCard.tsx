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
    <Link href={`/blog/${slug}`} className="group flex flex-col bg-white">
      {/* Image */}
      <div className="overflow-hidden bg-gray-100 aspect-[4/3]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.altText ?? title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="size-full bg-navy-900" />
        )}
      </div>

      {/* Content */}
      <div className="px-6 pt-5 pb-6 flex flex-col gap-3">
        <p className="text-[#0086b1] text-[13px] font-normal tracking-[0.65px] uppercase">
          {date}
        </p>
        <h2 className="text-navy-900 text-[15px] font-bold leading-5 line-clamp-2">
          {title}
        </h2>
        {excerpt && (
          <p className="text-gray-500 text-[15px] leading-5 line-clamp-2">
            {excerpt}
          </p>
        )}
        <span className="text-[#0086b1] text-[14px] font-medium tracking-[0.7px] mt-1">
          Read more →
        </span>
      </div>
    </Link>
  );
}
