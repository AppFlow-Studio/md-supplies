import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { FilterDrawer } from '../FilterDrawer'
import type { CollectionFilter } from '@/lib/shopify/types'

// The drawer is the only way a phone user reaches the filter rail, so its
// open/close and focus behaviour is the mobile filtering experience. Covers the
// "mobile filters" half of Bilal's "empty states and mobile filters" bullet.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/category/gloves',
}))

function filter(id: string, label: string, values: string[]): CollectionFilter {
  return {
    id,
    label,
    type: 'LIST',
    values: values.map((v) => ({ id: `${id}.${v}`, label: v, count: 3, input: '{}' })),
  }
}

const FILTERS = [
  filter('filter.p.m.custom.customer_filter_category', 'Categories', ['Hair Brush', 'Toothbrushes']),
  filter('filter.p.m.custom.brand_name', 'Brand', ['Dukal', 'Dawn Mist']),
]

afterEach(cleanup)

describe('FilterDrawer', () => {
  it('starts closed, so the rail never covers the grid on load', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={[]} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers a trigger labelled Filters', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={[]} />)
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  it('shows the active filter count on the trigger, so state is visible while closed', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={['a', 'b', 'c']} />)
    expect(screen.getByRole('button', { name: 'Filters (3)' })).toBeInTheDocument()
  })

  it('opens a modal dialog carrying the filters', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Filters')
    // The rail's real facet labels reached the drawer, not a placeholder.
    expect(screen.getByText('Categories')).toBeInTheDocument()
    expect(screen.getByText('Brand')).toBeInTheDocument()
  })

  it('closes on the X button', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape, so a phone user is never trapped in it', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on a backdrop tap', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    // Target the backdrop by its own class: the lucide icons also carry
    // aria-hidden, so a bare [aria-hidden] selector picks up the trigger icon.
    const backdrop = document.querySelector('div.bg-black\\/40')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop as Element)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves focus into the panel on open, so a keyboard user lands inside it', () => {
    render(<FilterDrawer filters={FILTERS} activeFilters={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('renders no dialog when there are no filters to show', () => {
    // A collection whose facets were all denied by the registry must not open an
    // empty drawer.
    render(<FilterDrawer filters={[]} activeFilters={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.queryByText('Categories')).not.toBeInTheDocument()
  })
})
