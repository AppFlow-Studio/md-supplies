import Link from 'next/link'
import Image from 'next/image'
import { CurrencySwitcher } from './CurrencySwitcher'
import type { AvailableCountry, SlimCollection } from '@/lib/shopify/types'
import { ROUTES } from '@/lib/routes'
import { buildCategoryNav } from '@/lib/category-nav'
import { LOGO_PATH } from '@/lib/bunnycdn'

const EXPLORE = [
  { label: 'Brands', href: ROUTES.brands },
  { label: 'Partners', href: ROUTES.partners },
  { label: 'Industries', href: ROUTES.industries },
  { label: 'Blog', href: ROUTES.blog },
  { label: 'OCC', href: ROUTES.solutions.occ },
  { label: 'Returns', href: ROUTES.returns },
]

const COMPANY_HELP = [
  { label: 'About Us', href: ROUTES.about },
  { label: 'FAQ', href: ROUTES.faq },
  { label: 'Contact Us', href: ROUTES.contact },
  { label: 'My Account', href: ROUTES.account },
  { label: 'Order Tracking', href: ROUTES.accountOrders },
  { label: 'Privacy Policy', href: ROUTES.policy('privacy') },
  { label: 'Terms of Service', href: ROUTES.policy('terms') },
  { label: 'Shipping Policy', href: ROUTES.policy('shipping') },
]

const LINKEDIN_HREF = 'http://LinkedIn.com/company/mdsupplies'

interface FooterProps {
  collections: SlimCollection[]
  availableCountries?: AvailableCountry[]
  currentCountry?: string
}

export function Footer({ collections, availableCountries = [], currentCountry = 'US' }: FooterProps) {
  const categoryNav = buildCategoryNav(collections)

  return (
    <footer className="bg-neutral-50 border-t border-blue-50 pt-14 pb-0">
      <div className="max-w-360 mx-auto px-4 md:px-8">
        {/* Main columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand column */}
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center mb-5">
              <Image src={LOGO_PATH} alt="MDSupplies" width={420} height={100} className="h-10 w-auto object-contain" />
            </Link>

            <p className="text-sm text-gray-500 leading-relaxed mb-7 max-w-sm">
              MDSupplies.com is a medical supply ecommerce company serving
              clinics, urgent care centers, HRT practices, home care agencies, and
              institutional buyers nationwide.
            </p>

            <div className="flex items-center gap-3">
              <a
                href={LINKEDIN_HREF}
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center hover:bg-[#006d92] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          {/* Top Categories (dynamic) */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              Top Categories
            </h4>
            <ul className="space-y-3">
              {categoryNav.primary.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {cat.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories (dynamic) */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              More Categories
            </h4>
            <ul className="space-y-3">
              {categoryNav.more.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {cat.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore (static) */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              Explore
            </h4>
            <ul className="space-y-3">
              {EXPLORE.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-500 hover:text-teal-500 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Help (static) */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              Company &amp; Help
            </h4>
            <ul className="space-y-3">
              {COMPANY_HELP.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-500 hover:text-teal-500 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 py-5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} MDSupplies. All rights reserved.
          </p>

          {availableCountries.length > 1 && (
            <CurrencySwitcher
              availableCountries={availableCountries}
              currentIsoCode={currentCountry}
            />
          )}
        </div>
      </div>
    </footer>
  )
}
