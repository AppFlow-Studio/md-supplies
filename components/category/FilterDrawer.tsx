'use client'

import { useEffect, useRef, useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import type { CollectionFilter } from '@/lib/shopify/types'
import { CategoryFilters } from '@/components/category/CategoryFilters'

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
  q?: string
}

export function FilterDrawer({ filters, activeFilters, currentSort, q }: Props) {
  const [open, setOpen] = useState(false)
  const count = activeFilters.length
  const panelRef = useRef<HTMLDivElement>(null)
  // Focus returns here on close instead of being dropped to the document.
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Focus returns to the trigger when the drawer closes (Phase 6).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key === 'Tab' && focusable.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      {/* Trigger — mobile only. Lives in the discovery toolbar beside Sort
          (Phase 8): full-width, 48px, and always word-labelled so the control
          is unambiguous for older shoppers. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="lg:hidden w-full flex items-center justify-center gap-2 border border-navy-900 bg-white text-navy-900 text-[16px] font-semibold px-4 h-[48px] hover:bg-neutral-50 transition-colors"
      >
        <SlidersHorizontal size={17} aria-hidden />
        {count > 0 ? `Filters (${count})` : 'Filters'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 w-full max-w-[320px] bg-white flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <span className="text-navy-900 text-[16px] font-semibold">
                Filters
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} className="text-navy-900" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <CategoryFilters
                filters={filters}
                activeFilters={activeFilters}
                currentSort={currentSort}
                q={q}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
