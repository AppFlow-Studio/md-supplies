import Link from "next/link";
import { CurrencySwitcher } from "./CurrencySwitcher";
import type { AvailableCountry } from "@/lib/shopify/types";

const TOP_CATEGORIES = [
  "Gloves",
  "Wound Care",
  "Needles & Syringes",
  "Surgical Sutures",
  "Testing",
  "Exam Room",
  "Respiratory",
  "Mobility",
];

const MORE_CATEGORIES = [
  "Surgery & Procedure",
  "Apparel & PPE",
  "Hygiene",
  "Home Care",
  "Emergency Supplies",
  "Incontinence",
  "IV Therapy",
  "Sterilization",
];

const COMPANY_HELP = [
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
  { label: "Wholesale / B2B", href: "/b2b" },
  { label: "My Account", href: "/b2b" },
  { label: "Order Tracking", href: "/tracking" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Shipping Policy", href: "/shipping" },
];

const SOCIAL = [
  {
    label: "Facebook",
    href: "#",
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

interface FooterProps {
  availableCountries?: AvailableCountry[]
  currentCountry?: string
}

export function Footer({ availableCountries = [], currentCountry = 'US' }: FooterProps) {
  return (
    <footer className="bg-neutral-50 border-t border-blue-50 pt-14 pb-0">
      <div className="max-w-360 mx-auto px-4 md:px-8">
        {/* Main columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-bold text-xl">
                <span className="text-navy-900">MD</span>
                <span className="text-teal-500">Supplies</span>
              </span>
            </Link>

            <p className="text-sm text-gray-500 leading-relaxed mb-7 max-w-sm">
              MDSupplies.com is a wholesale medical supply ecommerce company serving
              clinics, urgent care centers, HRT practices, home care agencies, and
              institutional buyers nationwide.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 mb-8">
              {SOCIAL.map(({ label, svg, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-teal-500 hover:border-teal-500 transition-colors"
                >
                  {svg}
                </a>
              ))}
            </div>

            {/* Newsletter */}
            <div className="flex items-end max-w-sm">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent border-b border-gray-200 text-sm text-navy-900 placeholder:text-gray-200 pb-2.5 focus:outline-none focus:border-teal-500 transition-colors"
              />
              <button type="button" className="bg-navy-900 text-white text-sm font-semibold px-6 py-2.5 hover:bg-navy-950 transition-colors shrink-0">
                Subscribe
              </button>
            </div>
          </div>

          {/* Top Categories */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              Top Categories
            </h4>
            <ul className="space-y-3">
              {TOP_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link href="#" className="text-sm text-gray-500 hover:text-teal-500 transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              More Categories
            </h4>
            <ul className="space-y-3">
              {MORE_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link href="#" className="text-sm text-gray-500 hover:text-teal-500 transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Help */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              Company & Help
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

          <Link
            href="/b2b"
            className="bg-teal-500 text-white text-sm font-semibold px-7 py-3 rounded-full hover:bg-[#006d92] transition-colors"
          >
            Get 10% OFF
          </Link>
        </div>
      </div>
    </footer>
  );
}
