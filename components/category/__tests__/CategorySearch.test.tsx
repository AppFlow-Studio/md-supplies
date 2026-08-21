import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * P0.4 — exactly ONE control clears the active category search.
 *
 * The reported defect was two X glyphs in and around the search field. There
 * were three sources of a clear action on a searched category page:
 *
 *   1. the browser's native `input[type="search"]` cancel button
 *      (::-webkit-search-cancel-button) — unlabelled and not keyboard
 *      reachable, rendered INSIDE the input next to ours;
 *   2. this component's own accessible "Clear search" button;
 *   3. a "Search: <term>" chip below the toolbar in CategoryResults, whose X
 *      performed the identical action.
 *
 * (1) is suppressed in app/globals.css, (3) was removed, and (2) is the single
 * surviving control. These tests hold that line.
 */

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/category/surgery-procedure',
  useSearchParams: () => new URLSearchParams(),
}))

import { CategorySearch } from '../CategorySearch'

afterEach(() => {
  cleanup()
  mockPush.mockReset()
})

describe('CategorySearch — a single clear control (P0.4)', () => {
  it('renders exactly one clear control once a query is active', () => {
    render(<CategorySearch scopeTitle="Surgery & Procedure" searchQuery="scalpel" activeFilters={[]} />)
    expect(screen.getAllByRole('button', { name: /clear search/i })).toHaveLength(1)
  })

  it('renders no clear control at all when the field is empty', () => {
    render(<CategorySearch scopeTitle="Surgery & Procedure" activeFilters={[]} />)
    expect(screen.queryAllByRole('button', { name: /clear search/i })).toHaveLength(0)
  })

  it('still shows exactly one after typing into an empty field', () => {
    render(<CategorySearch scopeTitle="Surgery & Procedure" activeFilters={[]} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'trocar' } })
    expect(screen.getAllByRole('button', { name: /clear search/i })).toHaveLength(1)
  })

  it('gives the control a real accessible name and keyboard-reachable button semantics', () => {
    render(<CategorySearch scopeTitle="Surgery & Procedure" searchQuery="scalpel" activeFilters={[]} />)
    const clear = screen.getByRole('button', { name: 'Clear search' })
    // A <button> (not a div with onClick) is what makes it tabbable and
    // Enter/Space-activatable without extra handlers.
    expect(clear.tagName).toBe('BUTTON')
    expect(clear).toHaveAttribute('type', 'button')
  })

  it('clears the query and drops ?q= from the URL, preserving other state', () => {
    render(
      <CategorySearch
        scopeTitle="Surgery & Procedure"
        searchQuery="scalpel"
        currentSort="PRICE_ASC"
        activeFilters={['{"available":true}']}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = new URL(mockPush.mock.calls[0][0], 'https://mdsupplies.com')
    expect(url.pathname).toBe('/category/surgery-procedure')
    expect(url.searchParams.get('q')).toBeNull()
    // Clearing the search must not also clear sort/filters — or reset to a
    // different result set than the one the shopper had.
    expect(url.searchParams.get('sort')).toBe('PRICE_ASC')
    expect(url.searchParams.getAll('filter')).toEqual(['{"available":true}'])
    // No page param is carried over: a new result set starts at page 1.
    expect(url.searchParams.get('page')).toBeNull()
  })

  it('empties the visible input immediately, not only after the navigation lands', () => {
    render(<CategorySearch scopeTitle="Surgery & Procedure" searchQuery="scalpel" activeFilters={[]} />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('scalpel')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(input.value).toBe('')
  })

  it('Escape clears the field through the same single path', () => {
    render(<CategorySearch scopeTitle="Surgery & Procedure" searchQuery="scalpel" activeFilters={[]} />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('')
    expect(mockPush).toHaveBeenCalledTimes(1)
  })
})

describe('native search cancel button is suppressed globally (P0.4)', () => {
  // A CSS assertion rather than a DOM one on purpose: jsdom does not implement
  // ::-webkit-search-cancel-button, so the duplicate X is invisible to any
  // component test. The rule's PRESENCE is the thing that has to survive
  // refactors; its visual effect is covered by the Playwright pass.
  const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')

  it('hides the WebKit/Blink cancel pseudo-element', () => {
    expect(css).toMatch(/input\[type="search"\]::-webkit-search-cancel-button/)
  })

  it('hides the legacy IE/Edge clear pseudo-element', () => {
    expect(css).toMatch(/input\[type="search"\]::-ms-clear/)
  })

  /**
   * The regression this exists for, in full:
   *
   * The first fix declared only `-webkit-appearance: none; appearance: none`.
   * That reads as correct and passed every check we had — but Lightning CSS
   * drops the prefixed longhand as redundant beside the standard property, so
   * the PRODUCTION build emitted `…::-webkit-search-cancel-button{appearance:none}`.
   * This legacy shadow pseudo-element honours `-webkit-appearance` only, so the
   * minified rule did nothing and Chrome kept painting its own X next to ours.
   *
   * `display: none` survives minification intact and cannot degrade to a no-op,
   * so it — not the appearance pair — is what actually suppresses the control.
   */
  /**
   * The declaration block for the cancel-button rule.
   *
   * Comments are stripped FIRST, and the selector is matched in full. Both
   * matter, and both were learned the hard way against a stylesheet that was
   * already correct:
   *  · the explanatory comment above the rule names both selectors, so an
   *    indexOf-based slice between them captured prose with no declarations;
   *  · that same comment quotes the broken minified output verbatim
   *    (`::-webkit-search-cancel-button{appearance:none}`) as the thing to
   *    avoid, so a loose regex matched the counter-example instead of the rule.
   */
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const cancelRule =
    cssNoComments.match(
      /input\[type="search"\]::-webkit-search-cancel-button[^{}]*\{([^}]*)\}/,
    )?.[1] ?? ''

  it('suppresses the native control with display:none, which minification cannot drop', () => {
    expect(cancelRule, 'no ::-webkit-search-cancel-button rule found').not.toBe('')
    expect(cancelRule).toMatch(/display:\s*none/)
  })

  it('does not rely on -webkit-appearance alone, which the minifier removes', () => {
    const hasAppearanceOnly =
      /appearance:\s*none/.test(cancelRule) && !/display:\s*none/.test(cancelRule)
    expect(
      hasAppearanceOnly,
      'appearance:none alone is a no-op on this pseudo-element after minification',
    ).toBe(false)
  })
})
