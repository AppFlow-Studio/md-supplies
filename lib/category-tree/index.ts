// THE category registry: single source of truth for nav, tiles, breadcrumbs,
// collection routes, and sitemap — sourced from the category:/subcategory:
// tag backbone snapshot (tree.data.json), not the collection list.
import treeData from './tree.data.json'
import { ROUTES } from '@/lib/routes'
import {
  L1_CATEGORIES, BOUNDARY_OVERRIDES, DUAL_CATEGORY_OVERRIDES,
  FORCE_CLASSIFICATION,
} from './config'
import { canonicalCategoryTag, resolveParent, classifySubcategoryTag } from './derive'
import type { CategoryTreeData, SubcategoryNode, L1Config } from './types'

const data = treeData as CategoryTreeData

type L1Node = L1Config & { productCount: number }

const l1Counts = new Map(data.l1.map((c) => [c.tag, c.productCount]))

const l1Nodes: L1Node[] = L1_CATEGORIES.map((c) => ({
  ...c,
  productCount: l1Counts.get(c.tag) ?? 0,
}))

const byHandle = new Map(l1Nodes.map((c) => [c.handle, c]))
const byTag = new Map(l1Nodes.map((c) => [c.tag, c]))

const subcategoryNodes: SubcategoryNode[] = data.l2.flatMap((entry) => {
  const resolved = resolveParent(entry.tag, entry.parents, BOUNDARY_OVERRIDES)
  if (!resolved || !byTag.has(resolved.parentTag)) return []
  return [{
    tag: entry.tag,
    parentTag: resolved.parentTag,
    ...(resolved.crossLinkTag ? { crossLinkTag: resolved.crossLinkTag } : {}),
    kind: classifySubcategoryTag(entry.tag, FORCE_CLASSIFICATION),
    productCount: Object.values(entry.parents).reduce((a, b) => a + b, 0),
  }]
})

export function getL1Categories(): L1Node[] {
  return l1Nodes
}

export function getAllowedL1Handles(): Set<string> {
  return new Set(l1Nodes.map((c) => c.handle))
}

export function getNavGroups(): {
  primary: { displayName: string; href: string }[]
  more: { displayName: string; href: string }[]
} {
  const primary: { displayName: string; href: string }[] = []
  const more: { displayName: string; href: string }[] = []
  for (const c of l1Nodes) {
    const entry = { displayName: c.displayName, href: ROUTES.category(c.handle) }
    ;(c.navGroup === 'primary' ? primary : more).push(entry)
  }
  return { primary, more }
}

export function getSubcategoriesOf(l1Tag: string): SubcategoryNode[] {
  return subcategoryNodes.filter((s) => s.parentTag === l1Tag && s.kind === 'category')
}

export function getCrossLinkedInto(l1Tag: string): SubcategoryNode[] {
  return subcategoryNodes.filter((s) => s.crossLinkTag === l1Tag && s.kind === 'category')
}

export function getL1ByHandle(handle: string): L1Node | null {
  return byHandle.get(handle) ?? null
}

export function getL1ByTag(tag: string): L1Node | null {
  return byTag.get(tag) ?? null
}

/** Display-only humanization — identity stays tag/handle, never title. */
export function subcategoryTitle(tag: string): string {
  return tag.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Breadcrumb path from the product's OWN tags (canonical category: via the
 * dual-category override table). Never emits the cross-linked branch: the
 * L2 crumb appears only when the subcategory's ONE canonical parent is the
 * product's own L1.
 */
export function getBreadcrumbFromTags(
  tags: string[],
  productHandle: string,
): { l1: { label: string; href: string } | null; l2: { label: string; href: string } | null } {
  const categoryTag = canonicalCategoryTag({ handle: productHandle, tags }, DUAL_CATEGORY_OVERRIDES)
  const l1 = categoryTag ? byTag.get(categoryTag) ?? null : null
  if (!l1) return { l1: null, l2: null }

  const subTags = tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.startsWith('subcategory:'))
    .map((t) => t.slice('subcategory:'.length).trim())
  const sub = subcategoryNodes.find(
    (s) => subTags.includes(s.tag) && s.kind === 'category' && s.parentTag === l1.tag,
  )
  return {
    l1: { label: l1.displayName, href: ROUTES.category(l1.handle) },
    l2: sub
      ? { label: subcategoryTitle(sub.tag), href: ROUTES.subcategory(l1.handle, sub.tag) }
      : null,
  }
}
