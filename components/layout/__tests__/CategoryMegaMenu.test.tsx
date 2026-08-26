import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'
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

/** Mirror CategoryMegaMenu's own timing constants. */
const HOVER_INTENT_MS = 100
const RIGHTWARD_GRACE_MS = 140

/** Runs pending timers AND flushes the React update they schedule. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

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

  it('swaps the detail panel on a deliberate hover without touching the rail', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderMenu()
      const railLink = container.querySelector<HTMLAnchorElement>('a[data-tag="home-care"]')!
      fireEvent.mouseEnter(railLink.closest('li')!)
      advance(HOVER_INTENT_MS)

      const panel = visiblePanel(container)
      expect(panel.id).toBe('mega-panel-home-care')
      expect(within(panel).getByRole('link', { name: 'Bedside Commodes' })).toBeTruthy()
      // Every department is still listed — the rail does not change, only the
      // column beside it.
      expect(container.querySelectorAll('a[data-rail-link]')).toHaveLength(CATEGORIES.length)
    } finally {
      vi.useRealTimers()
    }
  })

  it('swaps the detail panel on keyboard focus, not only hover', () => {
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

describe('CategoryMegaMenu — hover intent (the diagonal problem)', () => {
  // The rail is two columns and the detail panel sits to the right of BOTH, so
  // reaching a column-one department's panel means dragging the pointer across
  // column two. Switching on the bare mouseenter made column-one departments
  // effectively unreachable by mouse: the panel had already been replaced by
  // whichever column-two row the pointer crossed on the way.

  it('does not hand the panel to a department the pointer merely swept across', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderMenu()
      const li = (tag: string) => container.querySelector<HTMLElement>(`a[data-tag="${tag}"]`)!.closest('li')!

      // Sitting on Gloves (column one).
      fireEvent.mouseEnter(li('gloves'))
      advance(HOVER_INTENT_MS)
      expect(visiblePanel(container).id).toBe('mega-panel-gloves')

      // Sweeping right across two column-two rows on the way to the panel,
      // faster than the intent delay.
      fireEvent.mouseEnter(li('home-care'))
      advance(40)
      fireEvent.mouseEnter(li('surgery-procedure'))
      advance(40)
      // ...and arriving.
      fireEvent.mouseEnter(container.querySelector<HTMLElement>('#mega-panel-gloves')!.parentElement!)
      advance(1000)

      expect(visiblePanel(container).id).toBe('mega-panel-gloves')
    } finally {
      vi.useRealTimers()
    }
  })

  it('still switches when the pointer actually rests on a department', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderMenu()
      const li = (tag: string) => container.querySelector<HTMLElement>(`a[data-tag="${tag}"]`)!.closest('li')!
      fireEvent.mouseEnter(li('home-care'))
      advance(HOVER_INTENT_MS)
      expect(visiblePanel(container).id).toBe('mega-panel-home-care')
    } finally {
      vi.useRealTimers()
    }
  })

  it('never makes the keyboard wait — focus and clicks switch at once', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderMenu()
      fireEvent.focus(container.querySelector<HTMLAnchorElement>('a[data-tag="surgery-procedure"]')!)
      expect(visiblePanel(container).id).toBe('mega-panel-surgery-procedure')

      fireEvent.click(screen.getByRole('button', { name: 'Show Home Care subcategories' }))
      expect(visiblePanel(container).id).toBe('mega-panel-home-care')
    } finally {
      vi.useRealTimers()
    }
  })

  it('holds the panel while the pointer is still travelling rightward toward it', () => {
    // The mechanism that actually fixes the diagonal: a fixed delay cannot tell
    // a slow sweep from a deliberate hover, so a department commits only once
    // the pointer has STOPPED heading for the panel.
    vi.useFakeTimers()
    try {
      const { container } = renderMenu()
      const root = container.firstElementChild!
      const li = (tag: string) => container.querySelector<HTMLElement>(`a[data-tag="${tag}"]`)!.closest('li')!

      fireEvent.mouseEnter(li('gloves'))
      advance(HOVER_INTENT_MS)
      expect(visiblePanel(container).id).toBe('mega-panel-gloves')

      // Pointer crosses a column-two row, still moving right the whole time.
      fireEvent.mouseMove(root, { clientX: 100 })
      fireEvent.mouseEnter(li('home-care'))
      for (let x = 140; x <= 380; x += 40) {
        fireEvent.mouseMove(root, { clientX: x })
        advance(HOVER_INTENT_MS)
        expect(visiblePanel(container).id).toBe('mega-panel-gloves')
      }

      // It stops heading right — now the hovered department may take over.
      advance(RIGHTWARD_GRACE_MS + HOVER_INTENT_MS)
      expect(visiblePanel(container).id).toBe('mega-panel-home-care')
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels a pending switch once the pointer is inside the panel', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderMenu()
      const panelColumn = container.querySelector<HTMLElement>('#mega-panel-gloves')!.parentElement!
      fireEvent.mouseEnter(container.querySelector<HTMLElement>('a[data-tag="home-care"]')!.closest('li')!)
      fireEvent.mouseEnter(panelColumn)
      advance(1000)
      expect(visiblePanel(container).id).toBe('mega-panel-gloves')
    } finally {
      vi.useRealTimers()
    }
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
