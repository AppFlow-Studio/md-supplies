import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Header } from '../Header'
import type { MenuItem, SlimCollection } from '@/lib/shopify/types'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/store/CartProvider', () => ({
  useCart: () => ({ cart: null, openCart: vi.fn() }),
}))

vi.mock('@/components/layout/SearchDropdown', () => ({
  SearchDropdown: () => <div data-testid="search-dropdown" />,
}))

// Mutable so a test can simulate a route change and assert the header's
// overlays reset. Header reads usePathname() for exactly that.
let mockPathname = '/category/gloves'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'gid://shopify/MenuItem/1',
    title: 'Gloves',
    url: '',
    type: 'COLLECTION',
    tags: [],
    items: [],
    ...overrides,
  }
}

function makeCollection(handle: string, title: string): SlimCollection {
  return {
    id: `gid://shopify/Collection/${handle}`,
    handle,
    title,
    description: '',
    descriptionHtml: '',
    updatedAt: '2026-01-01T00:00:00Z',
    image: null,
    seo: { title: null, description: null },
  }
}

const COLLECTIONS: SlimCollection[] = [
  makeCollection('gloves', 'Gloves'),
  makeCollection('exam-gloves', 'Exam Gloves'),
]

const MENU: MenuItem[] = [
  makeMenuItem({
    id: 'gid://shopify/MenuItem/1',
    title: 'Gloves',
    items: [
      { id: 's1', title: 'Exam Gloves', url: '', items: [] },
      { id: 's2', title: 'Totally Fake Category', url: '', items: [] },
    ],
  }),
]

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('Header — crawlable nav DOM (NF7)', () => {
  it('renders submenu /category/ links in the DOM without any interaction', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    // Panels are CSS-hidden but present (desktop dropdown + mobile drawer):
    // server HTML must contain the submenu links for crawl equity.
    const subs = screen.getAllByRole('link', { name: 'Exam Gloves', hidden: true })
    expect(subs.length).toBeGreaterThanOrEqual(2)
    subs.forEach((l) => expect(l).toHaveAttribute('href', '/category/exam-gloves'))
  })
})

describe('Header — desktop disclosure keyboard/ARIA (NF8)', () => {
  it('trigger button has aria-haspopup/aria-expanded/aria-controls and toggles on click', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const trigger = screen.getByRole('button', { name: 'Gloves submenu' })

    expect(trigger).toHaveAttribute('aria-haspopup', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const panelId = trigger.getAttribute('aria-controls')!
    expect(document.getElementById(panelId)).not.toBeNull()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(panelId)!.classList.contains('hidden')).toBe(false)

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(panelId)!.classList.contains('hidden')).toBe(true)
  })

  it('opens on focus within the item and closes on Escape with focus returned to the trigger', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const trigger = screen.getByRole('button', { name: 'Gloves submenu' })

    fireEvent.focus(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger)
  })
})

describe('Header — mobile drawer a11y (NF9)', () => {
  function openDrawer() {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const hamburger = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(hamburger)
    return hamburger
  }

  it('hamburger carries aria-expanded/aria-controls wired to the drawer', () => {
    const hamburger = openDrawer()
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-menu')
    expect(document.getElementById('mobile-menu')!.classList.contains('hidden')).toBe(false)
  })

  it('locks body scroll while open and unlocks on close', () => {
    const hamburger = openDrawer()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(hamburger)
    expect(document.body.style.overflow).toBe('')
  })

  it('closes on Escape and returns focus to the hamburger', () => {
    const hamburger = openDrawer()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(hamburger)
    expect(document.body.style.overflow).toBe('')
  })

  it('moves focus into the drawer on open and traps Tab inside it', () => {
    openDrawer()
    const drawer = document.getElementById('mobile-menu')!
    expect(drawer.contains(document.activeElement)).toBe(true)

    // Shift+Tab from the first focusable wraps to the last
    const focusables = drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    // Tab from the last wraps back to the first
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })
})

describe('Header — Trocars nested under Surgery & Procedure (P0.2)', () => {
  // categoriesItem (the mega-dropdown + mobile categories panel) only renders
  // when a menu item of type CATALOG is present — see Header.tsx's
  // `categoriesItem = menuItems.find((item) => item.type === 'CATALOG')`.
  const MENU_WITH_CATALOG: MenuItem[] = [
    makeMenuItem({ id: 'gid://shopify/MenuItem/catalog', title: 'Categories', type: 'CATALOG' }),
    ...MENU,
  ]

  // Both handles must be live: the parent nav entry is gated on
  // `surgery-procedure` and the nested child on `trocars-trocar-kits`.
  const COLLECTIONS_WITH_TROCARS: SlimCollection[] = [
    ...COLLECTIONS,
    makeCollection('surgery-procedure', 'Surgery & Procedure'),
    makeCollection('trocars-trocar-kits', 'Trocars & Trocar Kits'),
  ]

  // Replaces the Task 13 "Trocar Supplies quick link" pair. Those asserted the
  // detached badge — a second link to the SAME href as the Surgery & Procedure
  // tile, labelled differently, sitting at the foot of the panel. P0.2 removes
  // it: Trocars is now a distinct route nested under its parent.

  it('renders parent and child as two DISTINCT links, each to its own route (desktop)', () => {
    render(<Header menuItems={MENU_WITH_CATALOG} collections={COLLECTIONS_WITH_TROCARS} />)
    // The categories panel is always in the DOM (CSS-toggled, see NF7 above),
    // so its links are queryable via hidden: true without simulating hover/focus.
    const [surgery] = screen.getAllByRole('link', { name: 'Surgery & Procedure', hidden: true })
    const [trocars] = screen.getAllByRole('link', { name: 'Trocars & Trocar Kits', hidden: true })

    expect(surgery).toHaveAttribute('href', '/category/surgery-procedure')
    expect(trocars).toHaveAttribute('href', '/category/trocars-trocar-kits')
    // The exact defect being guarded: one page under two names.
    expect(trocars.getAttribute('href')).not.toBe(surgery.getAttribute('href'))
  })

  it('nests the child inside its parent list item, not as a sibling of the category grid', () => {
    render(<Header menuItems={MENU_WITH_CATALOG} collections={COLLECTIONS_WITH_TROCARS} />)
    const [surgery] = screen.getAllByRole('link', { name: 'Surgery & Procedure', hidden: true })
    const [trocars] = screen.getAllByRole('link', { name: 'Trocars & Trocar Kits', hidden: true })

    // Structural containment is what makes the relationship real for a screen
    // reader rather than implied by visual proximity.
    const parentItem = surgery.closest('li')
    expect(parentItem).not.toBeNull()
    expect(parentItem!.contains(trocars)).toBe(true)
  })

  it('no longer renders the detached "Trocar Supplies" badge anywhere', () => {
    render(<Header menuItems={MENU_WITH_CATALOG} collections={COLLECTIONS_WITH_TROCARS} />)
    expect(screen.queryAllByRole('link', { name: 'Trocar Supplies', hidden: true })).toHaveLength(0)
    expect(screen.queryAllByRole('link', { name: /Trocar Supplies/, hidden: true })).toHaveLength(0)
  })

  it('renders the same parent/child pair in the mobile categories panel', () => {
    render(<Header menuItems={MENU_WITH_CATALOG} collections={COLLECTIONS_WITH_TROCARS} />)
    // Desktop panel + mobile drawer both render the pair, so each label
    // resolves to exactly two links — one per breakpoint's markup.
    expect(screen.getAllByRole('link', { name: 'Trocars & Trocar Kits', hidden: true })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Surgery & Procedure', hidden: true })).toHaveLength(2)
  })

  it('omits the child when its collection is not live, without dropping the parent', () => {
    const withoutTrocars: SlimCollection[] = [
      ...COLLECTIONS,
      makeCollection('surgery-procedure', 'Surgery & Procedure'),
    ]
    render(<Header menuItems={MENU_WITH_CATALOG} collections={withoutTrocars} />)
    expect(screen.getAllByRole('link', { name: 'Surgery & Procedure', hidden: true }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Trocars & Trocar Kits', hidden: true })).toHaveLength(0)
  })
})

describe('Header — menu slug validation (NF11)', () => {
  it('keeps hrefs whose slug matches a real collection handle', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const links = screen.getAllByRole('link', { name: 'Exam Gloves', hidden: true })
    links.forEach((l) => expect(l).toHaveAttribute('href', '/category/exam-gloves'))
  })

  it('falls back to /categories for a menu title with no matching collection', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const links = screen.getAllByRole('link', { name: 'Totally Fake Category', hidden: true })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((l) => expect(l).toHaveAttribute('href', '/categories'))
  })

  it('skips validation when the collections list is empty (fetch failed)', () => {
    render(<Header menuItems={MENU} collections={[]} />)
    const links = screen.getAllByRole('link', { name: 'Exam Gloves', hidden: true })
    links.forEach((l) => expect(l).toHaveAttribute('href', '/category/exam-gloves'))
  })
})

describe('Header — always-visible mobile search bar', () => {
  it('renders a real search field wired to the production /search route', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const input = screen.getByRole('searchbox', { name: /search medical supplies/i })
    expect(input).toHaveAttribute('name', 'q')

    // Same endpoint and query param as the predictive dropdown and the
    // WebSite SearchAction schema — not a parallel search system.
    const form = input.closest('form')!
    expect(form).toHaveAttribute('action', '/search')
    expect(form.getAttribute('method')?.toUpperCase()).toBe('GET')
  })

  it('shows the field below md and the icon-only trigger from md up', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const input = screen.getByRole('searchbox', { name: /search medical supplies/i })
    // The row is phone-only; desktop keeps the icon + predictive dropdown.
    const row = input.closest('form')!.parentElement!
    expect(row.className).toContain('md:hidden')

    // The icon trigger, not the form's submit button (both read as "Search").
    const searchIcon = document.querySelector<HTMLElement>('button[aria-label="Search"]')!
    expect(searchIcon).not.toBeNull()
    expect(searchIcon.className).toContain('hidden')
    expect(searchIcon.className).toContain('md:inline-flex')
  })

  it('gives the field an accessible name rather than relying on the placeholder', () => {
    render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    const input = screen.getByRole('searchbox', { name: /search medical supplies/i })
    expect(input).toHaveAttribute('aria-label')
    expect(input).toHaveAttribute('placeholder')
  })
})

describe('Header — overlays reset on route change', () => {
  it('closes the drawer and releases the body scroll lock when the path changes', () => {
    mockPathname = '/category/gloves'
    const { rerender } = render(<Header menuItems={MENU} collections={COLLECTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(document.getElementById('mobile-menu')!.classList.contains('hidden')).toBe(false)
    expect(document.body.style.overflow).toBe('hidden')

    // Regression: tapping the LOGO (which carries no onClick close handler)
    // navigated but left the drawer mounted over the new page AND left the
    // body scroll-locked, so the destination could not be scrolled at all.
    mockPathname = '/'
    rerender(<Header menuItems={MENU} collections={COLLECTIONS} />)

    expect(document.getElementById('mobile-menu')!.classList.contains('hidden')).toBe(true)
    expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(document.body.style.overflow).toBe('')
  })

  it('does not reset overlays when only the query string changes', () => {
    // Catalog filter/sort/pagination navigate with scroll:false on the SAME
    // pathname; treating those as "left the page" would close the drawer and
    // fight the deliberate no-scroll behaviour.
    mockPathname = '/category/gloves'
    const { rerender } = render(<Header menuItems={MENU} collections={COLLECTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(document.getElementById('mobile-menu')!.classList.contains('hidden')).toBe(false)

    rerender(<Header menuItems={MENU} collections={COLLECTIONS} />)
    expect(document.getElementById('mobile-menu')!.classList.contains('hidden')).toBe(false)
  })
})
