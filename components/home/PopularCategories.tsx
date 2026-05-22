import Link from "next/link";

interface CollectionSummary {
  id: string;
  title: string;
  handle: string;
  image: { url: string; altText: string | null } | null;
}

interface Props {
  collections: CollectionSummary[];
}

export function PopularCategories({ collections }: Props) {
  return (
    <section className="w-full bg-white">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Popular Categories
          </h2>
          <Link
            href="/shop"
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            Browse all categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
          {collections.map(({ id, title, handle, image }) => (
            <Link
              key={id}
              href={`/category/${handle}`}
              className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-10 px-4"
            >
              <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center overflow-hidden group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={image.altText ?? title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-teal-500 text-[20px] font-bold">
                    {title.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-[15px] font-semibold text-navy-900 text-center leading-snug">
                {title}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
