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

afterEach(cleanup)

describe('MobileCategoryNav — drill-down', () => {
  it('starts on the department list with every panel closed', () => {
    const { container } = render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={vi.fn()} resetKey="/" />,
    )
    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(isHidden(panel(container, 'mobility'))).toBe(true)
    expect(screen.getByRole('link', { name: 'Home Care' })).toHaveAttribute('href', '/category/home-care')
  })

  it('opens one department and hides the department list behind it', () => {
    const { container } = render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={vi.fn()} resetKey="/" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))

    expect(isHidden(panel(container, 'home-care'))).toBe(false)
    expect(container.querySelector('ul')?.className).toContain('hidden')
    expect(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'Bedside Commodes', hidden: true }),
    ).toHaveAttribute('href', '/category/home-care/bedside-commodes')
  })

  it('keeps exactly one department open — opening another closes the first', () => {
    const { container } = render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={vi.fn()} resetKey="/" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
    // Back out first — the list carrying the other department's control is
    // hidden while a panel is open, which is the point of a drill-down.
    fireEvent.click(within(panel(container, 'home-care')!).getByRole('button', { name: /Categories/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Show Mobility subcategories' }))

    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(isHidden(panel(container, 'mobility'))).toBe(false)
  })

  it('goes back to the department list', () => {
    const { container } = render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={vi.fn()} resetKey="/" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
    fireEvent.click(within(panel(container, 'home-care')!).getByRole('button', { name: /Categories/ }))

    expect(isHidden(panel(container, 'home-care'))).toBe(true)
    expect(container.querySelector('ul')?.className).not.toContain('hidden')
  })

  it('reports expanded state on the disclosure control', () => {
    render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={vi.fn()} resetKey="/" />,
    )
    const control = screen.getByRole('button', { name: 'Show Home Care subcategories' })
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(control).toHaveAttribute('aria-controls', 'mobile-cat-home-care')
    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'true')
  })

  it('gives a department with no subcategories a link and no disclosure control', () => {
    render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={vi.fn()} resetKey="/" />,
    )
    expect(screen.queryByRole('button', { name: 'Show Face Masks subcategories' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Face Masks' })).toHaveAttribute('href', '/category/face-masks')
  })

  it('closes the drawer on a terminal navigation, at both levels', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={onNavigate} resetKey="/" />,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Home Care' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
    fireEvent.click(
      within(panel(container, 'home-care')!).getByRole('link', { name: 'Bedside Commodes', hidden: true }),
    )
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })

  it('reopens at level one after a route change instead of inside the last department', () => {
    const { container, rerender } = render(
      <MobileCategoryNav categories={CATEGORIES} allHref="/categories" onNavigate={vi.fn()} resetKey="/" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
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
