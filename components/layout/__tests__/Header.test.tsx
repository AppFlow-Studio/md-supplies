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
