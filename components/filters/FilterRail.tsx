'use client'

import { useCatalogTransition } from '@/components/category/CatalogTransition'
import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import type { CollectionFilter } from '@/lib/shopify/types'
import { parsePriceBounds, calcPriceStep } from '@/lib/shopify/filters'

// Shared filter rail for the category and search pages (NF5/NF6 dedupe).
// The page-specific part — how the next URL is built (path, ?q, ?sort,
// tracking params) — comes in via `buildUrl`; everything else lives here.

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  buildUrl: (nextFilters: string[]) => string
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`size-[16px] shrink-0 border flex items-center justify-center transition-colors ${
        checked ? 'bg-navy-900 border-navy-900' : 'bg-white border-[rgba(102,102,100,0.6)]'
      }`}
    >
      {checked && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

/** Only CATEGORY is open by default; everything else starts collapsed. */
function isCategoryFacet(filter: CollectionFilter): boolean {
  return /(^|\.)category$/i.test(filter.id) || filter.label.trim().toLowerCase() === 'category'
}

/** Beyond this many values a group gets Show more + an in-facet search box. */
const VALUES_BEFORE_COLLAPSE = 8
const VALUES_BEFORE_SEARCH = 12

function FilterGroup({
  filter,
  selected,
  onToggle,
}: {
  filter: CollectionFilter
  selected: string[]
  onToggle: (input: string) => void
}) {
  // Default state (Phase 3): CATEGORY expanded, every other group collapsed —
  // a rail with eight groups open pushed products off the screen. A group that
  // already holds an active value opens so the selection is never hidden.
  const hasActive = filter.values.some((v) => selected.includes(v.input))
  const [open, setOpen] = useState(() => isCategoryFacet(filter) || hasActive)
  const [showAll, setShowAll] = useState(false)
  const [facetQuery, setFacetQuery] = useState('')

  // An incoming active value (chip removal, Back/Forward) reveals its group
  // without forcing every other group open. Adjusted during render.
  const [syncedActive, setSyncedActive] = useState(hasActive)
  if (hasActive !== syncedActive) {
    setSyncedActive(hasActive)
    if (hasActive) setOpen(true)
  }

  const searchable = filter.values.length > VALUES_BEFORE_SEARCH
  const q = facetQuery.trim().toLowerCase()
  const matched = q
    ? filter.values.filter((v) => v.label.toLowerCase().includes(q))
    : filter.values
  // Active values survive filtering and zero counts so a selection is never
  // silently dropped from view.
  const visible = showAll || q ? matched : matched.slice(0, VALUES_BEFORE_COLLAPSE)
  const shown = [
    ...visible,
    ...filter.values.filter((v) => selected.includes(v.input) && !visible.includes(v)),
  ]
  const hiddenCount = matched.length - visible.length

  return (
    <div className="mb-7">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between mb-3"
      >
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] uppercase">
          {filter.label}
        </p>
        <ChevronDown
          size={16}
          className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className="h-px bg-gray-200 mb-5" />
      {open && (
        <div className="flex flex-col gap-[18px]">
          {searchable && (
            <input
              type="search"
              value={facetQuery}
              onChange={(e) => setFacetQuery(e.target.value)}
              placeholder={`Search ${filter.label.toLowerCase()}`}
              aria-label={`Search ${filter.label} options`}
              className="w-full min-h-[44px] px-3 border border-gray-200 text-[15px] text-navy-900 focus:outline-none focus:border-navy-900"
            />
          )}
          {shown.map((value, idx) => (
            <label key={idx} className="flex items-center gap-[14px] cursor-pointer">
              <Checkbox
                checked={selected.includes(value.input)}
                onChange={() => onToggle(value.input)}
              />
              <span className="flex-1 text-navy-900 text-[15px] tracking-[0.3px]">
                {value.label}
              </span>
              <span className="text-gray-500 text-[15px] tracking-[0.3px]">
                {value.count}
              </span>
            </label>
          ))}
          {hiddenCount > 0 && !showAll && !q && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="self-start min-h-[44px] text-teal-500 text-[15px] font-semibold hover:underline"
            >
              Show {hiddenCount} more
            </button>
          )}
          {showAll && !q && matched.length > VALUES_BEFORE_COLLAPSE && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="self-start min-h-[44px] text-teal-500 text-[15px] font-semibold hover:underline"
            >
              Show less
            </button>
          )}
          {q && matched.length === 0 && (
            <p className="text-gray-500 text-[15px]">No options match “{facetQuery}”.</p>
          )}
        </div>
      )}
    </div>
  )
}

function parseActivePriceMax(filters: string[]): number | null {
  for (const f of filters) {
    try {
      const parsed = JSON.parse(f)
      if (parsed?.price?.max !== undefined) return Number(parsed.price.max)
    } catch { /* ignore */ }
  }
  return null
}

const PRICE_COMMIT_DEBOUNCE_MS = 400

function PriceRangeFilter({
  filter,
  selected,
  onSetPrice,
}: {
  filter: CollectionFilter
  selected: string[]
  onSetPrice: (input: string) => void
}) {
  const { min: rangeMin, max: rangeMax } = parsePriceBounds(filter)
  const step = calcPriceStep(rangeMax - rangeMin)

  const [open, setOpen] = useState(true)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The slider tracks the CURRENT selection (NF17: it used to be initialised
  // once and went stale after Clear-all / chip removal). Render-phase
  // reconcile: when the selected price filter changes from elsewhere, the
  // slider follows; local drags in between stay untouched.
  const selectedMax = parseActivePriceMax(selected)
  const target = selectedMax !== null ? Math.min(selectedMax, rangeMax) : rangeMax
  const [value, setValue] = useState(target)
  const [syncedTarget, setSyncedTarget] = useState(target)
  if (target !== syncedTarget) {
    setSyncedTarget(target)
    setValue(target)
  }

  const atMax = value >= rangeMax
  const pct   = Math.round(((value - rangeMin) / (rangeMax - rangeMin)) * 100)

  const commit = () => {
    if (commitTimer.current) clearTimeout(commitTimer.current)
    if (atMax) {
      onSetPrice('')
    } else {
      onSetPrice(JSON.stringify({ price: { min: rangeMin, max: value } }))
    }
  }

  // Keyboard operability (NF5): arrow/Home/End changes commit after a short
  // pause — no mouse required. Blur commits immediately; mouse/touch keep
  // their release-commit behaviour.
  const scheduleCommit = () => {
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(commit, PRICE_COMMIT_DEBOUNCE_MS)
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const displayMax = atMax ? `$${fmt(rangeMax)}+` : `$${fmt(value)}`

  return (
    <div className="mb-7">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between mb-3"
      >
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] uppercase">
          Price Range
        </p>
        <ChevronDown
          size={16}
          className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className="h-px bg-gray-200 mb-5" />
      {open && (
        <div>
          <input
            type="range"
            min={rangeMin}
            max={rangeMax}
            step={step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            onMouseUp={commit}
            onTouchEnd={commit}
            onKeyUp={scheduleCommit}
            onBlur={commit}
            className="price-slider w-full"
            style={{ '--slider-pct': `${pct}%` } as React.CSSProperties}
            aria-label="Maximum price"
            aria-valuetext={displayMax}
          />
          <div className="flex justify-between mt-3">
            <span className="text-navy-900 text-[13px] font-semibold tracking-[0.26px]">
              ${fmt(rangeMin)}
            </span>
            <span className="text-navy-900 text-[13px] font-semibold tracking-[0.26px]">
              {displayMax}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function FilterRail({ filters, activeFilters, buildUrl }: Props) {
  // Shared catalog transition: keeps current results on screen while the next
  // page loads, and never scrolls (Phase 6 owns scroll).
  const { navigate } = useCatalogTransition()

  // Optimistic selection (NF6): the next URL used to be derived from the
  // `activeFilters` PROP, which only updates after the server round-trip —
  // two quick checkbox clicks dropped the first selection. `selected` is the
  // local source of truth for building URLs; it reconciles with the server
  // value whenever the prop changes (navigation completed, chip removed,
  // back/forward). Render-phase state adjustment per React's
  // "adjusting state when a prop changes" pattern.
  const [selected, setSelected] = useState(activeFilters)
  const activeKey = activeFilters.join('\u0000')
  const [syncedKey, setSyncedKey] = useState(activeKey)
  if (activeKey !== syncedKey) {
    setSyncedKey(activeKey)
    setSelected(activeFilters)
  }

  const apply = (next: string[]) => {
    setSelected(next)
    navigate(buildUrl(next))
  }

  const toggleFilter = (input: string) => {
    apply(
      selected.includes(input)
        ? selected.filter((f) => f !== input)
        : [...selected, input],
    )
  }

  const setPriceFilter = (input: string) => {
    const withoutPrice = selected.filter((f) => {
      try { return JSON.parse(f)?.price === undefined } catch { return true }
    })
    apply(input ? [...withoutPrice, input] : withoutPrice)
  }

  const clearAll = () => apply([])

  return (
    <div className="flex flex-col">
      {selected.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-teal-500 text-[13px] font-medium tracking-[0.26px] self-start mb-5 hover:underline"
        >
          Clear all filters
        </button>
      )}
      {filters.map((f) => {
        if (f.type === 'PRICE_RANGE') {
          return (
            <PriceRangeFilter
              key={f.id}
              filter={f}
              selected={selected}
              onSetPrice={setPriceFilter}
            />
          )
        }
        return (
          <FilterGroup
            key={f.id}
            filter={f}
            selected={selected}
            onToggle={toggleFilter}
          />
        )
      })}
    </div>
  )
}
