'use client'

import { useId } from 'react'
import Link from 'next/link'

import type { MegaMenuChild } from '@/components/layout/CategoryMegaMenu'

// The subcategory rows every nav surface shares — the desktop mega-menu panel,
// the header shortcut dropdowns and the mobile drill-down panel — so a group
// (the old nav's third level, e.g. Respiratory Testing > COVID-19 …) reads the
// same everywhere: the group's own name is a real link to its page, and its
// children are listed beneath it, indented, in a list labelled by that link.
// Nothing is collapsed: a group is at most a handful of rows, and hiding
// COVID-19 behind another disclosure would bury the best sellers.
//
// Renders <li> elements only, so callers own the surrounding <ul> and can put
// their own primary "Browse All …" row ahead of these.

type Variant = 'compact' | 'touch'

const LINK: Record<Variant, string> = {
  compact:
    'block text-[13px] leading-5 px-2 py-[3px] rounded text-ink-link hover:text-navy-900 hover:bg-neutral-50 transition-colors',
  touch: 'block text-sm py-3 text-gray-500 hover:text-navy-900 transition-colors',
}
const HEAD: Record<Variant, string> = {
  compact:
    'block text-[13px] leading-5 px-2 py-[3px] rounded font-medium text-navy-900 hover:text-teal-500 hover:bg-neutral-50 transition-colors',
  touch: 'block text-sm py-3 font-medium text-navy-900 hover:text-teal-500 transition-colors',
}
const ROW: Record<Variant, string> = {
  compact: '',
  touch: 'border-b border-gray-100 last:border-b-0',
}
const GROUP_LIST: Record<Variant, string> = {
  compact: 'list-none m-0 p-0 ml-2 pl-1 border-l border-gray-100',
  touch: 'list-none m-0 p-0 ml-1 pl-4 border-l border-gray-100 border-t',
}

type Props = {
  items: MegaMenuChild[]
  variant: Variant
  /** Called on every link click — the mobile drawer closes itself with it. */
  onNavigate?: () => void
}

export function NavChildList({ items, variant, onNavigate }: Props) {
  // Curated (featured) rows pinned ahead of tag-derived ones, as before.
  const sorted = [...items.filter((c) => c.featured), ...items.filter((c) => !c.featured)]
  return (
    <>
      {sorted.map((child) =>
        child.children && child.children.length > 0 ? (
          <NavGroup key={child.href} group={child} variant={variant} onNavigate={onNavigate} />
        ) : (
          <li key={child.href} className={ROW[variant]}>
            <Link href={child.href} onClick={onNavigate} className={LINK[variant]}>
              {child.displayName}
            </Link>
          </li>
        ),
      )}
    </>
  )
}

function NavGroup({ group, variant, onNavigate }: { group: MegaMenuChild; variant: Variant; onNavigate?: () => void }) {
  const headId = useId()
  return (
    <li className={ROW[variant]}>
      <Link id={headId} href={group.href} onClick={onNavigate} className={HEAD[variant]}>
        {group.displayName}
      </Link>
      <ul aria-labelledby={headId} className={GROUP_LIST[variant]}>
        {group.children!.map((child) => (
          <li key={child.href} className={ROW[variant]}>
            <Link href={child.href} onClick={onNavigate} className={LINK[variant]}>
              {child.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  )
}
