import type { Metadata } from 'next'

// Safety net, not the source of truth: every page in this group already sets
// its own `robots: { index: false, follow: false }` (account/*, cart). Segment
// metadata overwrites (not merges) an ancestor's `robots` object, so this only
// takes effect if a future page in the group forgets to set it itself —
// DEV-LAUNCH-12.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NoindexLayout({ children }: { children: React.ReactNode }) {
  return children
}
