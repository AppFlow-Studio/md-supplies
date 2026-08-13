import { expect, type Page } from '@playwright/test'

/** A page must never scroll horizontally at any supported width. */
export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const d = document.documentElement
    return { scrollW: d.scrollWidth, clientW: d.clientWidth }
  })
  expect(
    overflow.scrollW,
    `${label}: document scrolls horizontally (${overflow.scrollW}px content in ${overflow.clientW}px viewport)`,
  ).toBeLessThanOrEqual(overflow.clientW + 1)
}

/**
 * No two distinct interactive elements may occupy the same point on
 * screen — a sticky header/CTA drifting over a link is invisible to an
 * overflow check but makes the covered control unclickable.
 */
export async function expectNoOverlappingInteractiveElements(page: Page, label: string) {
  const overlaps = await page.evaluate(() => {
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [role="button"]'
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      // checkVisibility (with the visibility-property check opted in) is a
      // strict superset of the old display/visibility check: it also catches
      // an element whose only hidden ancestor is a CLOSED <details> — e.g. a
      // "More" overflow panel. Chromium keeps a measurable
      // getBoundingClientRect() for that content (it uses content-visibility
      // rather than display:none so the open/close transition can animate),
      // so without this check every duplicate link inside a closed <details>
      // reads as "covered by" whatever real, visible element sits at those
      // coordinates — a false positive, since the link is not painted,
      // focusable, or clickable while the panel is closed.
      if (typeof el.checkVisibility === 'function') {
        return el.checkVisibility({ checkVisibilityCSS: true })
      }
      const style = getComputedStyle(el)
      return style.visibility !== 'hidden' && style.display !== 'none'
    })
    // True when (cx, cy) falls outside the clipped, visible box of some
    // scrolling/overflow-hidden ancestor of `el` — e.g. a point inside a
    // horizontally-scrollable rail (`overflow-x-auto`) that lies past the
    // rail's own right edge because the rail hasn't been scrolled there yet.
    // getBoundingClientRect() still reports that point's un-clipped, un-
    // scrolled geometry, so without this check every off-screen item in a
    // scroll rail reads as "covered by" whatever real, visible element the
    // browser actually paints at that pixel (typically a sibling control
    // positioned right after the rail).
    function isClippedByAncestorOverflow(el: HTMLElement, cx: number, cy: number): boolean {
      for (let node = el.parentElement; node; node = node.parentElement) {
        const s = getComputedStyle(node)
        if (s.overflowX === 'visible' && s.overflowY === 'visible') continue
        const r = node.getBoundingClientRect()
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return true
      }
      return false
    }

    const bad: string[] = []
    for (const el of els) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue
      if (isClippedByAncestorOverflow(el, cx, cy)) continue
      const topmost = document.elementFromPoint(cx, cy)
      if (topmost && !el.contains(topmost) && !topmost.contains(el)) {
        bad.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent ?? '').trim().slice(0, 40)}" is covered by ${topmost.tagName.toLowerCase()}${topmost.id ? '#' + topmost.id : ''}`)
      }
    }
    return bad
  })
  expect(overlaps, `${label}: interactive elements obscured by another element at their own center point`).toEqual([])
}

/**
 * A sticky-positioned element (header, filter bar, mobile CTA) must never
 * cover more than a small band of the viewport — otherwise it permanently
 * hides whatever content sits underneath it on short mobile viewports.
 */
export async function expectStickyDoesNotObscure(page: Page, label: string, maxRatio = 0.3) {
  const offenders = await page.evaluate((ratio) => {
    const bad: string[] = []
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const style = getComputedStyle(el)
      if (style.position !== 'sticky' && style.position !== 'fixed') return

      // A persistently-mounted fixed overlay (e.g. a cart drawer kept in the
      // DOM for its close transition) still has a full-size box while
      // closed, even though nothing is actually on screen: the backdrop
      // fades via opacity, and the panel slides out via transform. Neither
      // hides any real content, so both are excluded here — otherwise this
      // check fails identically on every single page.
      if (
        typeof el.checkVisibility === 'function' &&
        !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
      ) {
        return
      }
      const rect = el.getBoundingClientRect()
      if (rect.height === 0) return
      // A transform can move a fixed element fully outside the viewport
      // (e.g. `translate-x-full` sliding a closed drawer off to the side).
      // Its box still reports a height, but it covers no visible pixels.
      if (rect.right <= 0 || rect.left >= window.innerWidth || rect.bottom <= 0 || rect.top >= window.innerHeight) {
        return
      }
      // A narrow `position: sticky` column (a filter rail beside the product
      // grid, laid out as an ordinary flex/grid sibling) tracks the user's
      // scroll within its own space but never overlays the content next to
      // it — there is nothing "underneath" it to hide, unlike a full-width
      // sticky header/footer/CTA bar. This reasoning is specific to `sticky`:
      // it stays in normal flow, so a narrow sticky column can only sit
      // beside its siblings, never in front of them. `position: fixed` has
      // no such guarantee — a fixed element is removed from flow and can
      // legitimately overlay content at ANY width (e.g. a narrow fixed
      // off-canvas panel stuck open over the page). So only `sticky`
      // elements get the width exemption; `fixed` elements stay subject to
      // the un-relaxed height-ratio check below regardless of width.
      if (style.position === 'sticky' && rect.width / window.innerWidth < 0.5) return
      if (rect.height / window.innerHeight > ratio) {
        bad.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${Array.from(el.classList).slice(0, 2).join('.')} covers ${(rect.height / window.innerHeight * 100).toFixed(0)}% of viewport height`)
      }
    })
    return bad
  }, maxRatio)
  expect(offenders, `${label}: a sticky/fixed element covers more than ${maxRatio * 100}% of the viewport height`).toEqual([])
}

/** Cards in the same grid row must render at a consistent height. */
export async function expectConsistentCardHeights(page: Page, cardSelector: string, label: string) {
  const measurements = await page.evaluate((sel) => {
    return Array.from(document.querySelectorAll<HTMLElement>(sel)).map((el) => {
      const rect = el.getBoundingClientRect()
      return { height: Math.round(rect.height), top: Math.round(rect.top) }
    })
  }, cardSelector)
  if (measurements.length < 2) return
  const rows = new Map<number, number[]>()
  measurements.forEach(({ top, height }) => {
    const bucket = Math.round(top / 10) * 10
    rows.set(bucket, [...(rows.get(bucket) ?? []), height])
  })
  for (const [rowTop, rowHeights] of rows) {
    const min = Math.min(...rowHeights)
    const max = Math.max(...rowHeights)
    expect(max - min, `${label}: cards in the row at y≈${rowTop} vary in height by ${max - min}px (${JSON.stringify(rowHeights)})`).toBeLessThanOrEqual(2)
  }
}
