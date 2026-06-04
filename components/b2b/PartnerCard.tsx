import Link from 'next/link'
import type { Partner } from '@/types/partner'

interface Props {
  partner: Partner
}

export function PartnerCard({ partner }: Props) {
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group flex flex-col border border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow p-5 gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center h-12 flex-1 min-w-0">
          <img
            src={partner.logo.url}
            alt={partner.logo.altText || partner.name}
            width={partner.logo.width}
            height={partner.logo.height}
            loading="lazy"
            decoding="async"
            className="max-h-10 w-auto object-contain"
          />
        </div>
        <span
          className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.3px] px-2.5 py-1 rounded-full ${
            partner.type === 'brand'
              ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20'
              : 'bg-navy-900/10 text-navy-900 border border-navy-900/20'
          }`}
        >
          {partner.type === 'brand' ? 'Brand' : 'Vendor'}
        </span>
      </div>
      <div>
        <h2 className="text-base font-bold text-navy-900 mb-1 group-hover:text-teal-500 transition-colors">
          {partner.name}
        </h2>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{partner.description}</p>
      </div>
    </Link>
  )
}
