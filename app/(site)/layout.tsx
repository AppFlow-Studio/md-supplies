import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import '../globals.css'
import { GoogleTagManager } from '@next/third-parties/google'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { IS_STAGING, SITE_ORIGIN } from '@/lib/site-config'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  // Base for every relative metadata URL (canonical, og:url, og:image) —
  // guarded against dev values in lib/site-config.ts (audit H4/L13).
  metadataBase: new URL(SITE_ORIGIN),
  title: 'MDSupplies',
  description: 'Medical-Grade Supplies, Delivered Fast',
}

// Root layout for the public/marketing route group — everything except
// /account and /search (app/(protected)/layout.tsx, a separate root layout;
// see that file's doc comment for why the split exists). This group renders
// a cached static PPR shell (Cache Components, next.config.ts), so it must
// never read request headers/cookies itself — CSP is applied per-route in
// proxy.ts instead (a static 'unsafe-inline' policy here; the strict
// per-request nonce only applies to the other group).
export default function SiteRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      {!IS_STAGING && process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
      <body className="min-h-full flex flex-col">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  )
}
