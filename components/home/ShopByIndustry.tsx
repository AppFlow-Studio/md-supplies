import Link from 'next/link'
import { FadeIn } from '@/components/ui/FadeIn'
import { AnimatedArrow } from '@/components/ui/AnimatedArrow'
import { INDUSTRIES } from '@/lib/industries'
import { ROUTES } from '@/lib/routes'

export function ShopByIndustry() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Shop By Industry
          </h2>
          <Link
            href={ROUTES.industries}
            className="group text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap inline-flex items-center gap-1"
          >
            All Industries <AnimatedArrow size={14} />
          </Link>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {INDUSTRIES.slice(0,4).map(({ name, slug, image }, i) => (
            <FadeIn key={slug} delay={i * 0.08}>
              <Link
                href={ROUTES.industry(slug)}
                className="group relative overflow-hidden aspect-[314/390] block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/65 transition-opacity duration-300 group-hover:opacity-0" />
                <span className="absolute bottom-5 left-5 text-white text-[20px] font-semibold tracking-[0.4px] drop-shadow-md">
                  {name}
                </span>
              </Link>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  )
}
