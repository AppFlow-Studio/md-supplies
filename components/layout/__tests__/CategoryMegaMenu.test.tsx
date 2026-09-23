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
    expect(document.activeElement?.textContent).toBe('Browse All Gloves')
  })

  it('names each panel after its department for assistive tech', () => {
    const { container } = renderMenu()
    const panel = container.querySelector<HTMLElement>('#mega-panel-home-care')!
    expect(panel).toHaveAttribute('aria-labelledby', 'mega-rail-home-care')
    expect(container.querySelector('#mega-rail-home-care')?.textContent).toBe('Home Care')
  })
})

describe('CategoryMegaMenu — one meaning per control, not per row (2026-09-04)', () => {
  // A row used to be one control doing double duty as both "go here" and
  // "open here" — which meant it could only ever do one of the two (see the
  // CategoryMegaMenu.tsx file-header comment for the full history: link-only
  // was ambiguous, button-only made the client's Wound Care demo read as
  // broken). Now every row with children carries TWO real, separate controls:
  // the name is a link, the chevron is the disclosure. Hovering either must
  // still never touch the active panel.

  it('gives every department row a real link to its own category page', () => {
    const { container } = renderMenu()
    const rail = container.querySelector<HTMLUListElement>('ul')!
    for (const cat of CATEGORIES) {
      const link = within(rail).getByRole('link', { name: cat.displayName })
      expect(link).toHaveAttribute('href', cat.href)
    }
  })

  it('the disclosure control never carries an href — it only opens, never navigates', () => {
    const { container } = renderMenu()
    for (const cat of CATEGORIES.filter((c) => c.children.length > 0)) {
      const disclosure = railItem(container, cat.tag)
      expect(disclosure.tagName).toBe('BUTTON')
      expect(disclosure).not.toHaveAttribute('href')
    }
  })

  it('puts the route to the category page first inside the panel', () => {
    const { container } = renderMenu()
    const panel = container.querySelector<HTMLElement>('#mega-panel-home-care')!
    const first = panel.querySelector('a')!
    expect(first).toHaveAttribute('href', '/category/home-care')
    expect(first.textContent).toBe('Browse All Home Care')
  })

  it('gives every department two routes to its category page: the rail name and the panel CTA', () => {
    // A childless department still carries two: its rail row IS the link, and
    // its (unreachable-by-click, but still crawlable) panel leads with
    // "Browse All …" too. A department with children now matches it exactly —
    // the rail name link plus the panel's own CTA — rather than relying on
    // the panel link alone.
    const { container } = renderMenu()
    for (const cat of CATEGORIES) {
      expect(
        container.querySelectorAll(`a[href="${cat.href}"]`).length,
        `${cat.displayName} category link`,
      ).toBe(2)
    }
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

  it('does not change the panel on hover over the name link either — hovering EITHER half of the split row is inert', () => {
    const { container } = renderMenu()
    expect(visiblePanel(container).id).toBe('mega-panel-gloves')
    const rail = container.querySelector<HTMLUListElement>('ul')!
    const nameLink = within(rail).getByRole('link', { name: 'Home Care' })
    fireEvent.mouseEnter(nameLink)
    fireEvent.mouseOver(nameLink)
    fireEvent.mouseMove(nameLink)
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

  it('rotates the open department’s chevron, so the rail shows what is on screen', () => {
    const { container } = renderMenu()
    const chevronIn = (tag: string) => railItem(container, tag).querySelector('svg')!

    // classList, not a substring match: the base class already carries
    // `group-hover:...`, which could otherwise substring-match.
    expect(chevronIn('gloves').classList.contains('rotate-180')).toBe(true)
    expect(chevronIn('home-care').classList.contains('rotate-180')).toBe(false)

    fireEvent.click(railItem(container, 'home-care'))
    expect(chevronIn('home-care').classList.contains('rotate-180')).toBe(true)
    expect(chevronIn('gloves').classList.contains('rotate-180')).toBe(false)
  })

  it('carries the same forward-hover motion as the rest of the site on the panel’s go-somewhere links', () => {
    // The rail's own disclosure chevron deliberately does NOT carry this
    // motion — it is a ChevronDown, not the ArrowRight "go somewhere" glyph
    // (see the file-header comment on why those two must not be conflated).
    // AnimatedArrow, and its hover nudge, stay on the links that actually
    // navigate: the panel's "Browse All" CTA and the childless rail row.
    const { container } = renderMenu()
    const panelCta = container.querySelector<HTMLElement>('#mega-panel-gloves a')!
    const arrow = panelCta.querySelector('svg')!
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
    // "Browse All Surgery & Procedure" leads, then the featured child ahead
    // of the tag-derived ones.
    expect(items[0].textContent).toBe('Browse All Surgery & Procedure')
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
