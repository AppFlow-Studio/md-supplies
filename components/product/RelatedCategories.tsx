import Link from 'next/link'
import type { RelatedCollection } from '@/types/product'

interface Props {
  collections: RelatedCollection[]
}

export function RelatedCategories({ collections }: Props) {
  if (collections.length === 0) return null

  return (
    <section aria-labelledby="related-categories-heading" className="border-t border-gray-200 pt-8">
      <h2 id="related-categories-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Related Categories
      </h2>
      <ul className="flex flex-wrap gap-2">
        {collections.map((col) => (
          <li key={col.handle}>
            <Link
              href={`/category/${col.handle}`}
              className="inline-block px-4 py-2 text-sm font-medium text-teal-500 border border-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors"
            >
              {col.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
