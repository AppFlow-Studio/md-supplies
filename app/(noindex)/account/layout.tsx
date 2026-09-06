import { Suspense } from 'react'

// Cache Components: every account page is per-user and reads the session cookie
// (getSession) at request time. Wrapping the group's children in a <Suspense>
// boundary with an empty fallback defers the whole subtree to request time — the
// documented replacement for the per-page `export const dynamic = 'force-dynamic'`
// we removed (getting-started/caching §"Opting out of the static shell"). The
// account area is private + noindex, so there is no static-shell/SEO cost.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
