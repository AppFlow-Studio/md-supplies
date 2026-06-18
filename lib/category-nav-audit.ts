import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
import { ROADMAP_CATEGORIES, type RoadmapCategory } from '@/lib/category-nav'

export type AuditCollectionInput = {
  handle: string
  title: string
  hasProduct: boolean
  image: { url: string } | null
  seo: { title: string | null; description: string | null }
}

export type CollectionFlags = {
  handle: string
  title: string
  excluded: boolean
  zeroProduct: boolean
  missingImage: boolean
  missingSeoTitle: boolean
  missingSeoDescription: boolean
  unmappedOrphan: boolean
}

function isMatchedHandle(handle: string, roadmap: RoadmapCategory[]): boolean {
  return roadmap.some((category) => category.matchedHandles.includes(handle))
}

function isKnownSubcategory(handle: string, roadmap: RoadmapCategory[]): boolean {
  return roadmap.some((category) =>
    category.matchedHandles.some((parentHandle) => handle.startsWith(`${parentHandle}-`)),
  )
}

export function buildCollectionFlags(
  collections: AuditCollectionInput[],
  roadmap: RoadmapCategory[] = ROADMAP_CATEGORIES,
): CollectionFlags[] {
  return collections.map((collection) => {
    const excluded = EXCLUDED_COLLECTION_HANDLES.has(collection.handle)
    const unmappedOrphan =
      !excluded &&
      !isMatchedHandle(collection.handle, roadmap) &&
      !isKnownSubcategory(collection.handle, roadmap)

    return {
      handle: collection.handle,
      title: collection.title,
      excluded,
      zeroProduct: !collection.hasProduct,
      missingImage: !collection.image,
      missingSeoTitle: !collection.seo.title,
      missingSeoDescription: !collection.seo.description,
      unmappedOrphan,
    }
  })
}

export type RoadmapCoverage = {
  displayName: string
  navGroup: 'primary' | 'more'
  status: 'mapped' | 'synthesized' | 'unmapped'
  matchedHandles: string[]
}

export function buildRoadmapCoverage(
  collections: { handle: string }[],
  roadmap: RoadmapCategory[] = ROADMAP_CATEGORIES,
): RoadmapCoverage[] {
  const liveHandles = new Set(collections.map((c) => c.handle))
  return roadmap.map((category) => {
    const present = category.matchedHandles.filter((h) => liveHandles.has(h))
    const status: RoadmapCoverage['status'] =
      present.length === 0 ? 'unmapped' : category.matchedHandles.length > 1 ? 'synthesized' : 'mapped'
    return { displayName: category.displayName, navGroup: category.navGroup, status, matchedHandles: present }
  })
}
