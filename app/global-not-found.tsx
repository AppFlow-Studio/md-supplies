import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: "The page you're looking for doesn't exist or has been moved.",
}

// Catches genuinely unmatched URLs (no route file matches at all), which
// neither app/(site)/not-found.tsx nor app/(protected)/not-found.tsx can do
// — each only catches a notFound() thrown inside its own route group, and
// with two root layouts (app/(protected)/layout.tsx's doc comment explains
// why they're split) there's no single shared layout to hang a catch-all
// not-found off of. Requires experimental.globalNotFound in next.config.ts.
// Bypasses the app's normal render tree entirely (Next's docs: "skips
// rendering"), so it must import its own globals/fonts and return a full
// <html>/<body> — and deliberately skips SiteChrome (Header/Footer, which
// fetch live Shopify menu/collection data) so this last-resort fallback
// stays fast and dependency-free even when the rest of the app is unhealthy.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        <main id="main-content" className="bg-[#f9fafc] min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
            Error 404
          </p>
          <h1 className="text-navy-900 text-[60px] sm:text-[80px] font-bold leading-none mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-500 text-[18px] max-w-[480px] leading-[1.65] mb-10">
            The page you&#39;re looking for doesn&#39;t exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="bg-navy-900 text-white text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-navy-950 transition-colors"
            >
              Go Home
            </Link>
            <Link
              href="/categories"
              className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
            >
              Browse Categories
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
