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
      const style = getComputedStyle(el)
      return style.visibility !== 'hidden' && style.display !== 'none' && el.offsetParent !== null
    })
    const bad: string[] = []
    for (const el of els) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue
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
      const rect = el.getBoundingClientRect()
      if (rect.height === 0) return
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
  const heights = await page.evaluate((sel) => {
    return Array.from(document.querySelectorAll<HTMLElement>(sel)).map((el) => Math.round(el.getBoundingClientRect().height))
  }, cardSelector)
  if (heights.length < 2) return
  const rows = new Map<number, number[]>()
  const tops = await page.evaluate((sel) => Array.from(document.querySelectorAll<HTMLElement>(sel)).map((el) => Math.round(el.getBoundingClientRect().top)), cardSelector)
  tops.forEach((top, i) => {
    const bucket = Math.round(top / 10) * 10
    rows.set(bucket, [...(rows.get(bucket) ?? []), heights[i]])
  })
  for (const [rowTop, rowHeights] of rows) {
    const min = Math.min(...rowHeights)
    const max = Math.max(...rowHeights)
    expect(max - min, `${label}: cards in the row at y≈${rowTop} vary in height by ${max - min}px (${JSON.stringify(rowHeights)})`).toBeLessThanOrEqual(2)
  }
}
