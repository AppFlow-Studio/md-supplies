import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MobileCategoryNav } from '../MobileCategoryNav'
import type { MegaMenuCategory } from '../CategoryMegaMenu'

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...rest }: {
    href: string
    children: React.ReactNode
    onClick?: () => void
    [k: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...rest}>{children}</a>
  ),
}))

const CATEGORIES: MegaMenuCategory[] = [
  {
    tag: 'home-care',
    displayName: 'Home Care',
    href: '/category/home-care',
    children: [
      { displayName: 'Lifts', href: '/category/home-care/lifts' },
      { displayName: 'Bedside Commodes', href: '/category/home-care/bedside-commodes' },
    ],
  },
  {
    tag: 'mobility',
    displayName: 'Mobility',
    href: '/category/mobility',
    children: [{ displayName: 'Transport Chairs', href: '/category/mobility/transport-chairs' }],
  },
  { tag: 'face-masks', displayName: 'Face Masks', href: '/category/face-masks', children: [] },
]

function isHidden(el: HTMLElement | null) {
  return Boolean(el?.className.includes('hidden'))
}

function panel(container: HTMLElement, tag: string) {
  return container.querySelector<HTMLElement>(`#mobile-cat-${tag}`)
}

function renderNav(onNavigate: () => void = vi.fn(), resetKey = '/') {
  return render(
    <MobileCategoryNav
      categories={CATEGORIES}
      allHref="/categories"
      onNavigate={onNavigate}
      resetKey={resetKey}
    />,
  )
}

afterEach(cleanup)

describe('MobileCategoryNav — drill-down', () => {
  it('starts on the department list with every panel closed', () => {
    const { container } = renderNav()
    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(isHidden(panel(container, 'mobility'))).toBe(true)
  })

  it('opens a department when its row is tapped, and hides the list behind it', () => {
    const { container } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care' }))

    expect(isHidden(panel(container, 'home-care'))).toBe(false)
    expect(container.querySelector('ul')?.className).toContain('hidden')
    expect(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'Bedside Commodes', hidden: true }),
    ).toHaveAttribute('href', '/category/home-care/bedside-commodes')
  })

  it('keeps exactly one department open — opening another closes the first', () => {
    const { container } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care' }))
    // Back out first — the list carrying the other department's row is hidden
    // while a panel is open, which is the point of a drill-down.
    fireEvent.click(within(panel(container, 'home-care')!).getByRole('button', { name: /Categories/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Mobility' }))

    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(isHidden(panel(container, 'mobility'))).toBe(false)
  })

  it('goes back to the department list', () => {
    const { container } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care' }))
    fireEvent.click(within(panel(container, 'home-care')!).getByRole('button', { name: /Categories/ }))

    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(container.querySelector('ul')?.className).not.toContain('hidden')
  })

  it('reports expanded state on the department row', () => {
    renderNav()
    const row = screen.getByRole('button', { name: 'Home Care' })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row).toHaveAttribute('aria-controls', 'mobile-cat-home-care')
    fireEvent.click(row)
    expect(row).toHaveAttribute('aria-expanded', 'true')
  })

  it('reopens at level one after a route change instead of inside the last department', () => {
    const { container, rerender } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care' }))
    expect(isHidden(panel(container, 'home-care'))).toBe(false)

    rerender(
      <MobileCategoryNav
        categories={CATEGORIES}
        allHref="/categories"
        onNavigate={vi.fn()}
        resetKey="/category/home-care/bedside-commodes"
      />,
    )
    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(container.querySelector('ul')?.className).not.toContain('hidden')
  })
})

describe('MobileCategoryNav — one meaning per surface', () => {
  // Matches the desktop panel exactly: the department list SELECTS, the
  // department's own panel NAVIGATES. A shopper who learns the menu on a laptop
  // must not find that tapping a category name means something else on a phone
  // — and a row split between "go" and "drill in" is a coin flip with a thumb.

  it('puts no navigation in the department list — a row opens, it does not go anywhere', () => {
    const { container } = renderNav()
    const list = container.querySelector<HTMLUListElement>('ul')!
    const hrefs = Array.from(list.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    // Only the childless department (no panel to open) and the "All categories"
    // escape hatch are links.
    expect(hrefs).toEqual(['/category/face-masks', '/categories'])
  })

  it('puts the route to the category page first inside the department panel', () => {
    const { container } = renderNav()
    const first = panel(container, 'home-care')!.querySelector('a')!
    expect(first).toHaveAttribute('href', '/category/home-care')
    expect(first.textContent).toBe('All Home Care')
  })

  it('sends a department with no subcategories straight to its category page', () => {
    renderNav()
    expect(screen.queryByRole('button', { name: 'Face Masks' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Face Masks' })).toHaveAttribute('href', '/category/face-masks')
  })

  it('closes the drawer on a terminal navigation, never on a mere drill-in', () => {
    const onNavigate = vi.fn()
    const { container } = renderNav(onNavigate)

    fireEvent.click(screen.getByRole('button', { name: 'Home Care' }))
    expect(onNavigate).not.toHaveBeenCalled()

    fireEvent.click(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'All Home Care', hidden: true }),
    )
    expect(onNavigate).toHaveBeenCalledTimes(1)

    fireEvent.click(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'Bedside Commodes', hidden: true }),
    )
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })
})
