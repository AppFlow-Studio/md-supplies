import type { CollectionFilter } from './types';

export function getVisibleFilters(
  filters: CollectionFilter[],
  activeFilters: string[],
): CollectionFilter[] {
  return filters.reduce<CollectionFilter[]>((visible, group) => {
    if (group.type === 'PRICE_RANGE') {
      visible.push(group)
      return visible
    }

    const values = group.values.filter(
      (v) => v.count > 0 || activeFilters.includes(v.input),
    )
    if (values.length > 0) visible.push({ ...group, values })
    return visible
  }, [])
}

export function parsePriceBounds(filter: CollectionFilter): { min: number; max: number } {
  try {
    const parsed = JSON.parse(filter.values[0]?.input ?? '{}')
    const min = Math.max(0, Math.floor(Number(parsed?.price?.min ?? 0)))
    const max = Math.ceil(Number(parsed?.price?.max ?? 500))
    if (isFinite(min) && isFinite(max) && max > min) return { min, max }
  } catch { /* ignore */ }
  return { min: 0, max: 500 }
}

export function calcPriceStep(range: number): number {
  if (range <= 20) return 1
  if (range <= 100) return 2
  if (range <= 500) return 5
  if (range <= 2000) return 10
  if (range <= 10000) return 50
  return 100
}
