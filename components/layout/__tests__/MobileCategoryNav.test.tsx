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

  it('opens a department when its disclosure chevron is tapped, and hides the list behind it', () => {
    const { container } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care subcategories' }))

    expect(isHidden(panel(container, 'home-care'))).toBe(false)
    expect(container.querySelector('ul')?.className).toContain('hidden')
    expect(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'Bedside Commodes', hidden: true }),
    ).toHaveAttribute('href', '/category/home-care/bedside-commodes')
  })

  it('keeps exactly one department open — opening another closes the first', () => {
    const { container } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care subcategories' }))
    // Back out first — the list carrying the other department's row is hidden
    // while a panel is open, which is the point of a drill-down.
    fireEvent.click(within(panel(container, 'home-care')!).getByRole('button', { name: /Categories/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Mobility subcategories' }))

    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(isHidden(panel(container, 'mobility'))).toBe(false)
  })

  it('goes back to the department list', () => {
    const { container } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care subcategories' }))
    fireEvent.click(within(panel(container, 'home-care')!).getByRole('button', { name: /Categories/ }))

    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(container.querySelector('ul')?.className).not.toContain('hidden')
  })

  it('reports expanded state on the disclosure chevron', () => {
    renderNav()
    const chevron = screen.getByRole('button', { name: 'Home Care subcategories' })
    expect(chevron).toHaveAttribute('aria-expanded', 'false')
    expect(chevron).toHaveAttribute('aria-controls', 'mobile-cat-home-care')
    fireEvent.click(chevron)
    expect(chevron).toHaveAttribute('aria-expanded', 'true')
  })

  it('reopens at level one after a route change instead of inside the last department', () => {
    const { container, rerender } = renderNav()
    fireEvent.click(screen.getByRole('button', { name: 'Home Care subcategories' }))
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

describe('MobileCategoryNav — one meaning per control, not per row (2026-09-04)', () => {
  // Matches the desktop rail exactly: the department NAME is a real link, a
  // SEPARATE chevron drills into the subcategory panel. A shopper who learns
  // the menu on a laptop must not find that tapping a category name means
  // something else on a phone — and a row split between "go" and "drill in"
  // with no separate hit areas is a coin flip with a thumb.

  it('gives every department row a real link to its own category page', () => {
    const { container } = renderNav()
    const list = container.querySelector<HTMLUListElement>('ul')!
    for (const cat of CATEGORIES) {
      expect(within(list).getByRole('link', { name: cat.displayName })).toHaveAttribute('href', cat.href)
    }
  })

  it('the disclosure chevron never carries an href — it only opens, never navigates', () => {
    renderNav()
    for (const cat of CATEGORIES.filter((c) => c.children.length > 0)) {
      const chevron = screen.getByRole('button', { name: `${cat.displayName} subcategories` })
      expect(chevron).not.toHaveAttribute('href')
    }
  })

  it('puts the route to the category page first inside the department panel', () => {
    const { container } = renderNav()
    const first = panel(container, 'home-care')!.querySelector('a')!
    expect(first).toHaveAttribute('href', '/category/home-care')
    expect(first.textContent).toBe('Browse All Home Care')
  })

  it('sends a department with no subcategories straight to its category page', () => {
    renderNav()
    expect(screen.queryByRole('button', { name: 'Face Masks subcategories' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Face Masks' })).toHaveAttribute('href', '/category/face-masks')
  })

  it('closes the drawer on a terminal navigation, never on a mere drill-in', () => {
    const onNavigate = vi.fn()
    const { container } = renderNav(onNavigate)

    fireEvent.click(screen.getByRole('button', { name: 'Home Care subcategories' }))
    expect(onNavigate).not.toHaveBeenCalled()

    fireEvent.click(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'Browse All Home Care', hidden: true }),
    )
    expect(onNavigate).toHaveBeenCalledTimes(1)

    fireEvent.click(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'Bedside Commodes', hidden: true }),
    )
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })

  it('closes the drawer when the row’s own name is tapped, same as any other terminal navigation', () => {
    const onNavigate = vi.fn()
    const { container } = renderNav(onNavigate)
    const list = container.querySelector<HTMLUListElement>('ul')!

    fireEvent.click(within(list).getByRole('link', { name: 'Home Care' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
