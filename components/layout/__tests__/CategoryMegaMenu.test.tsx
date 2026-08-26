import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { CategoryMegaMenu, type MegaMenuCategory } from '../CategoryMegaMenu'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const CATEGORIES: MegaMenuCategory[] = [
  {
    tag: 'gloves',
    displayName: 'Gloves',
    href: '/category/gloves',
    children: [
      { displayName: 'Exam Gloves', href: '/category/gloves/exam-gloves' },
      { displayName: 'Surgical Gloves', href: '/category/gloves/surgical-gloves' },
    ],
  },
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
    tag: 'surgery-procedure',
    displayName: 'Surgery & Procedure',
    href: '/category/surgery-procedure',
    children: [
      { displayName: 'Trocars & Trocar Kits', href: '/category/trocars-trocar-kits', featured: true },
      { displayName: 'Scalpels', href: '/category/surgery-procedure/scalpels' },
    ],
  },
  // A department with no live subcategories — Room Furniture and Face Masks
  // are in this state on the QA store.
  { tag: 'room-furniture', displayName: 'Room Furniture', href: '/category/room-furniture', children: [] },
]

function renderMenu() {
  return render(
    <CategoryMegaMenu
      categories={CATEGORIES}
      allHref="/categories"
      featuredLink={{
        displayName: 'Trocars & Trocar Kits',
        href: '/category/trocars-trocar-kits',
        parentName: 'Surgery & Procedure',
      }}
    />,
  )
}

/** The panel currently on screen, i.e. the one not carrying `hidden`. */
function visiblePanel(container: HTMLElement): HTMLElement {
  const panels = Array.from(container.querySelectorAll<HTMLElement>('[id^="mega-panel-"]'))
  const shown = panels.filter((p) => !p.className.includes('hidden'))
  expect(shown).toHaveLength(1)
  return shown[0]
}

afterEach(cleanup)

describe('CategoryMegaMenu — progressive disclosure', () => {
  it('shows exactly one department’s subcategories at a time', () => {
    const { container } = renderMenu()
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
  })

  it('still renders every department’s children in the DOM for crawlers', () => {
    // The compression is about what a shopper SEES on open. Withholding the
    // links from the markup would cut the internal-link equity the category
    // pages depend on (see Header's NF7 note).
    renderMenu()
    for (const name of ['Exam Gloves', 'Bedside Commodes', 'Scalpels', 'Trocars & Trocar Kits']) {
      expect(screen.getAllByRole('link', { name, hidden: true }).length).toBeGreaterThan(0)
    }
  })

  it('swaps the detail panel when a department is opened, without touching the rail', () => {
    const { container } = renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))

    const panel = visiblePanel(container)
    expect(panel.id).toBe('mega-panel-home-care')
    expect(within(panel).getByRole('link', { name: 'Bedside Commodes' })).toBeTruthy()
    // Every department is still listed — the rail does not change, only the
    // column beside it.
    expect(container.querySelectorAll('a[data-rail-link]')).toHaveLength(CATEGORIES.length)
  })

  it('swaps the detail panel on keyboard focus', () => {
    const { container } = renderMenu()
    fireEvent.focus(container.querySelector<HTMLAnchorElement>('a[data-tag="surgery-procedure"]')!)
    expect(visiblePanel(container).id).toBe('mega-panel-surgery-procedure')
  })

  it('keeps each department name a direct link to its own category page', () => {
    // Navigation must never require expanding first.
    const { container } = renderMenu()
    const railLink = container.querySelector<HTMLAnchorElement>('a[data-tag="home-care"]')!
    expect(railLink).toHaveAttribute('href', '/category/home-care')
  })

  it('marks the open department’s disclosure control expanded, and the others not', () => {
    renderMenu()
    expect(screen.getByRole('button', { name: 'Show Gloves subcategories' }))
      .toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  it('offers no disclosure control for a department with no subcategories', () => {
    renderMenu()
    expect(screen.queryByRole('button', { name: 'Show Room Furniture subcategories' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Room Furniture' })).toHaveAttribute(
      'href',
      '/category/room-furniture',
    )
  })

  it('moves along the rail with Arrow keys and brings the panel with it', () => {
    const { container } = renderMenu()
    const rail = container.querySelector<HTMLUListElement>('ul')!
    const first = container.querySelector<HTMLAnchorElement>('a[data-tag="gloves"]')!
    first.focus()

    fireEvent.keyDown(rail, { key: 'ArrowDown' })
    expect(document.activeElement).toHaveAttribute('data-tag', 'home-care')
    expect(visiblePanel(container).id).toBe('mega-panel-home-care')

    fireEvent.keyDown(rail, { key: 'ArrowUp' })
    expect(document.activeElement).toHaveAttribute('data-tag', 'gloves')

    fireEvent.keyDown(rail, { key: 'End' })
    expect(document.activeElement).toHaveAttribute('data-tag', 'room-furniture')

    fireEvent.keyDown(rail, { key: 'Home' })
    expect(document.activeElement).toHaveAttribute('data-tag', 'gloves')
  })

  it('steps into the open panel with ArrowRight', () => {
    const { container } = renderMenu()
    const rail = container.querySelector<HTMLUListElement>('ul')!
    container.querySelector<HTMLAnchorElement>('a[data-tag="gloves"]')!.focus()
    fireEvent.keyDown(rail, { key: 'ArrowRight' })
    expect(document.activeElement).toHaveAttribute('href', '/category/gloves')
    expect(document.activeElement?.textContent).toBe('All Gloves')
  })

  it('names each panel after its department for assistive tech', () => {
    const { container } = renderMenu()
    const panel = container.querySelector<HTMLElement>('#mega-panel-home-care')!
    expect(panel).toHaveAttribute('aria-labelledby', 'mega-rail-home-care')
    expect(container.querySelector('#mega-rail-home-care')?.textContent).toBe('Home Care')
  })
})

describe('CategoryMegaMenu — click, not hover (the diagonal problem)', () => {
  // The rail is two columns and the detail panel sits to the right of BOTH, so
  // reaching a column-one department's panel means dragging the pointer across
  // column two. Every hover-based scheme — bare mouseenter, a fixed delay, a
  // direction guard — is a heuristic guessing at intent, and each one mis-fired
  // on real pointer paths. Opening is a click now, and these lock that in.

  it('does not change the panel on hover, however long the pointer rests', () => {
    const { container } = renderMenu()
    const li = (tag: string) => container.querySelector<HTMLElement>(`a[data-tag="${tag}"]`)!.closest('li')!

    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
    fireEvent.mouseEnter(li('home-care'))
    fireEvent.mouseOver(li('home-care'))
    fireEvent.mouseMove(li('home-care'))
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
  })

  it('does not change the panel when the pointer sweeps across other departments', () => {
    const { container } = renderMenu()
    const li = (tag: string) => container.querySelector<HTMLElement>(`a[data-tag="${tag}"]`)!.closest('li')!

    fireEvent.click(screen.getByRole('button', { name: 'Show Gloves subcategories' }))
    for (const tag of ['home-care', 'surgery-procedure', 'home-care']) {
      fireEvent.mouseEnter(li(tag))
      fireEvent.mouseOver(li(tag))
    }
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
  })

  it('opens the department whose disclosure control was clicked', () => {
    const { container } = renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Show Surgery & Procedure subcategories' }))
    expect(visiblePanel(container).id).toBe('mega-panel-surgery-procedure')
    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
    expect(visiblePanel(container).id).toBe('mega-panel-home-care')
  })

  it('keeps the department name a link, so opening is never required to navigate', () => {
    const { container } = renderMenu()
    const railLink = container.querySelector<HTMLAnchorElement>('a[data-tag="surgery-procedure"]')!
    expect(railLink).toHaveAttribute('href', '/category/surgery-procedure')
    // Clicking the NAME must not be intercepted into a panel switch.
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
  })

  it('nudges the open department arrow across, so the rail shows what is on screen', () => {
    const { container } = renderMenu()
    const arrowIn = (tag: string) =>
      container.querySelector<HTMLElement>(`button[aria-controls="mega-panel-${tag}"] svg`)!

    // classList, not a substring match: the base class already carries
    // `group-hover:translate-x-1`, which contains the same text.
    expect(arrowIn('gloves').classList.contains('translate-x-1')).toBe(true)
    expect(arrowIn('home-care').classList.contains('translate-x-1')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
    expect(arrowIn('home-care').classList.contains('translate-x-1')).toBe(true)
    expect(arrowIn('gloves').classList.contains('translate-x-1')).toBe(false)
  })

  it('carries the same hover motion the rest of the site uses for forward links', () => {
    const { container } = renderMenu()
    const arrow = container.querySelector<HTMLElement>('button[aria-controls="mega-panel-gloves"] svg')!
    expect(arrow.getAttribute('class')).toContain('group-hover:translate-x-1')
    expect(arrow.closest('.group')).not.toBeNull()
  })
})

describe('CategoryMegaMenu — Trocars prominence', () => {
  it('surfaces the featured link in the footer, visible the moment the menu opens', () => {
    const { container } = renderMenu()
    const footerLink = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('a[href="/category/trocars-trocar-kits"]'),
    ).filter((el) => !el.closest('[id^="mega-panel-"]'))
    expect(footerLink).toHaveLength(1)
    expect(footerLink[0].textContent).toBe('Trocars & Trocar Kits')
  })

  it('pins and badges it first inside its parent department’s panel', () => {
    const { container } = renderMenu()
    const panel = container.querySelector<HTMLElement>('#mega-panel-surgery-procedure')!
    const items = Array.from(panel.querySelectorAll('li'))
    // "All Surgery & Procedure" leads, then the featured child ahead of the
    // tag-derived ones.
    expect(items[1].textContent).toContain('Trocars & Trocar Kits')
    expect(items[1].textContent).toContain('Popular')
    // The badge must not become part of the link's accessible name.
    expect(within(panel).getByRole('link', { name: 'Trocars & Trocar Kits' })).toHaveAttribute(
      'href',
      '/category/trocars-trocar-kits',
    )
  })

  it('renders nothing extra when there is no featured link to show', () => {
    const { container } = render(
      <CategoryMegaMenu categories={CATEGORIES} allHref="/categories" />,
    )
    expect(container.textContent).not.toContain('Featured')
  })
})
