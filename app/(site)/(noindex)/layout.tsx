import type { Metadata } from 'next'

// Safety net, not the source of truth: cart already sets its own
// `robots: { index: false, follow: false }`. Segment metadata overwrites (not
// merges) an ancestor's `robots` object, so this only takes effect if a
// future page in this group forgets to set it itself — DEV-LAUNCH-12.
// (account/* has the same safety net one level up — app/(protected)/
// (noindex)/layout.tsx — since it moved to the separate (protected) root;
// see that root's layout.tsx doc comment for why.)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NoindexLayout({ children }: { children: React.ReactNode }) {
  return children
}
