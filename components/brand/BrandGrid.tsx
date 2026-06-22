'use client'

import Link from 'next/link'
import { BRANDS, brandHref, brandLogoUrl, type Brand } from '@/lib/brands'
import { BrandLogoImage } from '@/components/shared/BrandLogoImage'

// Group the (already alphabetical) approved list into A–Z sections.
function groupByLetter(brands: Brand[]) {
  const groups = new Map<string, Brand[]>()
  for (const b of brands) {
    const first = b.name.replace(/[^a-z0-9]/i, '').charAt(0).toUpperCase()
    const key = /[A-Z]/.test(first) ? first : '#'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(b)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function BrandTile({ brand }: { brand: Brand }) {
  const href = brandHref(brand)
  const logo = brandLogoUrl(brand)

  const inner = (
    <div className="flex h-[110px] items-center justify-center px-5 py-6">
      <BrandLogoImage
        src={logo}
        name={brand.name}
        className="max-h-12 w-auto max-w-[160px] object-contain grayscale opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
        fallbackClassName="text-center text-[15px] font-semibold leading-snug tracking-[0.02em] text-navy-900"
      />
    </div>
  )

  const base =
    'group block rounded-xl border border-gray-200 bg-white transition-shadow'

  return href ? (
    <Link href={href} className={`${base} hover:shadow-md`} aria-label={`${brand.name} products`}>
      {inner}
    </Link>
  ) : (
    // No valid destination → render without a link (§6.2)
    <div className={base}>{inner}</div>
  )
}

export function BrandGrid() {
  const groups = groupByLetter(BRANDS)

  return (
    <div className="flex flex-col gap-12">
      {groups.map(([letter, brands]) => (
        <section key={letter} aria-labelledby={`brand-letter-${letter}`}>
          <h2
            id={`brand-letter-${letter}`}
            className="mb-5 text-[20px] font-bold tracking-[0.4px] text-teal-500"
          >
            {letter}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {brands.map((b) => (
              <BrandTile key={b.slug} brand={b} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
