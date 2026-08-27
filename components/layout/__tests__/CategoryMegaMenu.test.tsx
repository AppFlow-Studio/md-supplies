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

const railItem = (container: HTMLElement, tag: string) =>
  container.querySelector<HTMLElement>(`[data-rail-item][data-tag="${tag}"]`)!

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

  it('opens a department when its row is clicked', () => {
    const { container } = renderMenu()
    fireEvent.click(railItem(container, 'home-care'))

    const panel = visiblePanel(container)
    expect(panel.id).toBe('mega-panel-home-care')
    expect(within(panel).getByRole('link', { name: 'Bedside Commodes' })).toBeTruthy()
    // Every department is still listed — the rail does not change, only the
    // column beside it.
    expect(container.querySelectorAll('[data-rail-item]')).toHaveLength(CATEGORIES.length)
  })

  it('opens a department on keyboard focus, so Tab previews as the pointer would', () => {
    const { container } = renderMenu()
    fireEvent.focus(railItem(container, 'surgery-procedure'))
    expect(visiblePanel(container).id).toBe('mega-panel-surgery-procedure')
  })

  it('marks the open department expanded, and the others not', () => {
    const { container } = renderMenu()
    expect(railItem(container, 'gloves')).toHaveAttribute('aria-expanded', 'true')
    expect(railItem(container, 'home-care')).toHaveAttribute('aria-expanded', 'false')
  })

  it('sends a department with no subcategories straight to its category page', () => {
    // Nothing to disclose, so there is no panel worth opening and the row is
    // the destination.
    const { container } = renderMenu()
    const row = railItem(container, 'room-furniture')
    expect(row.tagName).toBe('A')
    expect(row).toHaveAttribute('href', '/category/room-furniture')
    expect(row).not.toHaveAttribute('aria-expanded')
  })

  it('moves along the rail with Arrow keys and brings the panel with it', () => {
    const { container } = renderMenu()
    const rail = container.querySelector<HTMLUListElement>('ul')!
    railItem(container, 'gloves').focus()

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

  it('steps into the open panel with ArrowRight, landing on its primary link', () => {
    const { container } = renderMenu()
    const rail = container.querySelector<HTMLUListElement>('ul')!
    railItem(container, 'gloves').focus()
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

describe('CategoryMegaMenu — one meaning per surface', () => {
  // The rail used to carry a link (the name) and a disclosure control (an
  // arrow) in one 26px row: two targets, two meanings, no separation, and the
  // disclosure wearing the glyph this site uses for "go somewhere". Nobody
  // could tell which half did what. The rail selects; the panel navigates.

  it('puts no navigation in the rail — a department row selects, it does not go anywhere', () => {
    const { container } = renderMenu()
    const rail = container.querySelector<HTMLUListElement>('ul')!
    // Only the childless department, which has no panel to open, is a link.
    const links = Array.from(rail.querySelectorAll('a'))
    expect(links.map((a) => a.getAttribute('data-tag'))).toEqual(['room-furniture'])
  })

  it('puts the route to the category page first inside the panel', () => {
    const { container } = renderMenu()
    const panel = container.querySelector<HTMLElement>('#mega-panel-home-care')!
    const first = panel.querySelector('a')!
    expect(first).toHaveAttribute('href', '/category/home-care')
    expect(first.textContent).toBe('All Home Care')
  })

  it('still gives every department a real, crawlable category link', () => {
    // The link moved out of the rail and into the panel; it must not have been
    // lost. A childless department carries two — its rail row IS the link, and
    // its panel still leads with "All …" for the keyboard path that can reach
    // it — which is fine: the requirement is that none went missing.
    const { container } = renderMenu()
    for (const cat of CATEGORIES) {
      const links = container.querySelectorAll(`a[href="${cat.href}"]`)
      expect(links.length, `${cat.displayName} category link`).toBeGreaterThan(0)
    }
    // And for a department with children, exactly one — the panel's.
    expect(container.querySelectorAll('a[href="/category/home-care"]')).toHaveLength(1)
  })

  it('does not change the panel on hover, however long the pointer rests', () => {
    const { container } = renderMenu()
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
    const row = railItem(container, 'home-care')
    fireEvent.mouseEnter(row)
    fireEvent.mouseOver(row)
    fireEvent.mouseMove(row)
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
  })

  it('does not change the panel when the pointer sweeps across other departments', () => {
    const { container } = renderMenu()
    fireEvent.click(railItem(container, 'gloves'))
    for (const tag of ['home-care', 'surgery-procedure', 'home-care']) {
      fireEvent.mouseEnter(railItem(container, tag))
      fireEvent.mouseOver(railItem(container, tag))
    }
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
  })

  it('nudges the open department arrow across, so the rail shows what is on screen', () => {
    const { container } = renderMenu()
    const arrowIn = (tag: string) => railItem(container, tag).querySelector('svg')!

    // classList, not a substring match: the base class already carries
    // `group-hover:translate-x-1`, which contains the same text.
    expect(arrowIn('gloves').classList.contains('translate-x-1')).toBe(true)
    expect(arrowIn('home-care').classList.contains('translate-x-1')).toBe(false)

    fireEvent.click(railItem(container, 'home-care'))
    expect(arrowIn('home-care').classList.contains('translate-x-1')).toBe(true)
    expect(arrowIn('gloves').classList.contains('translate-x-1')).toBe(false)
  })

  it('carries the same hover motion the rest of the site uses for forward links', () => {
    const { container } = renderMenu()
    const arrow = railItem(container, 'gloves').querySelector('svg')!
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
    expect(items[0].textContent).toBe('All Surgery & Procedure')
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
