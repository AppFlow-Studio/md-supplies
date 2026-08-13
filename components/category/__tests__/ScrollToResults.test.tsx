import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ScrollToResults } from '../ScrollToResults'

afterEach(cleanup)

/**
 * Phase 6. `resultsKey` replaced the old `page` prop: filter, sort and search
 * changes are new result sets too, and previously none of them scrolled while
 * pagination always did.
 *
 * Default geometry in these tests puts the anchor far below the fold
 * (getBoundingClientRect is 0/0 in jsdom, which counts as "already visible"),
 * so each test sets the rect it needs explicitly.
 */
function setAnchorTop(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top, bottom: top + 400, left: 0, right: 0, width: 800, height: 400, x: 0, y: top,
    toJSON: () => ({}),
  } as DOMRect)
}

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  })
}

let scrollIntoView: ReturnType<typeof vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>>

beforeEach(() => {
  scrollIntoView = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>()
  HTMLElement.prototype.scrollIntoView = scrollIntoView
  window.innerHeight = 800
  mockReducedMotion(false)
  setAnchorTop(2000) // well below the fold unless a test says otherwise
})

afterEach(() => vi.restoreAllMocks())

describe('ScrollToResults', () => {
  it('does not scroll on initial mount', () => {
    render(<ScrollToResults resultsKey="a"><div>results</div></ScrollToResults>)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls when the complete results state changes', () => {
    const { rerender } = render(<ScrollToResults resultsKey="a"><div>r</div></ScrollToResults>)
    rerender(<ScrollToResults resultsKey="b"><div>r</div></ScrollToResults>)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('does not scroll on a re-render with the same results state', () => {
    const { rerender } = render(<ScrollToResults resultsKey="a"><div>r</div></ScrollToResults>)
    rerender(<ScrollToResults resultsKey="a"><div>r, refreshed</div></ScrollToResults>)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('uses instant scrolling under prefers-reduced-motion', () => {
    mockReducedMotion(true)
    const { rerender } = render(<ScrollToResults resultsKey="a"><div>r</div></ScrollToResults>)
    rerender(<ScrollToResults resultsKey="b"><div>r</div></ScrollToResults>)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('leaves the viewport alone when the results are already in view', () => {
    // Shopper is looking at the toolbar and ticks a filter — yanking the page
    // would be worse than doing nothing.
    setAnchorTop(80)
    const { rerender } = render(<ScrollToResults resultsKey="a"><div>r</div></ScrollToResults>)
    rerender(<ScrollToResults resultsKey="b"><div>r</div></ScrollToResults>)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls when the results have been pushed far below the fold', () => {
    setAnchorTop(1200)
    const { rerender } = render(<ScrollToResults resultsKey="a"><div>r</div></ScrollToResults>)
    rerender(<ScrollToResults resultsKey="b"><div>r</div></ScrollToResults>)
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('scrolls when the results have scrolled well above the viewport', () => {
    // e.g. paginating from controls near the footer.
    setAnchorTop(-900)
    const { rerender } = render(<ScrollToResults resultsKey="a"><div>r</div></ScrollToResults>)
    rerender(<ScrollToResults resultsKey="b"><div>r</div></ScrollToResults>)
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('carries a scroll-margin so the sticky header cannot cover the results', () => {
    const { container } = render(<ScrollToResults resultsKey="a"><div>r</div></ScrollToResults>)
    expect(container.firstElementChild?.className).toMatch(/scroll-mt-/)
  })
})
