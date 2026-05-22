import Link from "next/link";

export interface BlogPost {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
}

export function BlogCard({ slug, date, title, excerpt }: BlogPost) {
  return (
    <article className="flex flex-col">

      {/* Dark header — fixed 152px to match Figma */}
      <div className="bg-navy-900 h-[152px] px-7 pt-7 overflow-hidden flex flex-col gap-3">
        <p className="text-teal-500 text-[14px] font-normal leading-5 tracking-[0.7px] uppercase shrink-0">
          {date}
        </p>
        <h2 className="text-[#f9fafc] text-[15px] font-bold leading-5 line-clamp-3">
          {title}
        </h2>
      </div>

      {/* White body — fixed 155px to match Figma */}
      <div className="bg-white h-[155px] px-7 pt-[35px] pb-[43px] overflow-hidden flex flex-col gap-[18px]">
        <p className="text-gray-500 text-[15px] leading-5 line-clamp-2">
          {excerpt}
        </p>
        <Link
          href={`/blog/${slug}`}
          className="text-teal-500 text-[14px] font-medium tracking-[0.7px] hover:underline shrink-0"
        >
          Read more →
        </Link>
      </div>

    </article>
  );
}
