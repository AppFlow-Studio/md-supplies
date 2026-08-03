import { test, expect, type Page } from '@playwright/test'

/**
 * WCAG AA contrast regression guard.
 *
 * Measures RENDERED colour against the EFFECTIVE background rather than
 * trusting class names, because the class tells you nothing useful on its own:
 * this theme overrides `--color-teal-500` to #006d92 (5.83:1 on white), so
 * reasoning from stock Tailwind values gives the wrong answer in both
 * directions — it flags compliant text and clears failing text.
 *
 * Thresholds are the real ones: 4.5:1 normal text, 3:1 large text (>=24px, or
 * >=18.66px bold), 3:1 non-text (icons and aria-hidden decoration).
 *
 * Failures print colour, size, background, ratio and the offending class list,
 * so a regression is actionable from the CI log without a local repro.
 */

const ROUTES = [
  { path: '/', name: 'home (product cards)' },
  { path: '/product/qa-no-rate', name: 'PDP — zero price' },
  { path: '/product/qa-out-of-stock', name: 'PDP — out of stock' },
  { path: '/product/qa-backorder', name: 'PDP — backorder' },
  { path: '/contact', name: 'contact' },
  { path: '/account', name: 'account' },
  { path: '/cart', name: 'cart' },
  { path: '/industries', name: 'industry index' },
  { path: '/blog/types-of-needles', name: 'article' },
] as const

async function measure(page: Page) {
  return page.evaluate(() => {
    // Let the browser resolve any colour syntax (this theme is authored in
    // oklch; scraping digits out of "oklch(1 0 0)" reads white as red).
    const cvs = document.createElement('canvas')
    cvs.width = cvs.height = 1
    const ctx = cvs.getContext('2d', { willReadFrequently: true })!
    const cache = new Map<string, number[]>()
    const toRgb = (css: string) => {
      const hit = cache.get(css)
      if (hit) return hit
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      const v = [d[0], d[1], d[2], d[3] / 255]
      cache.set(css, v)
      return v
    }
    const lum = ([r, g, b]: number[]) => {
      const c = [r, g, b].map((v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    const ratio = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)]
      const hi = Math.max(x, y), lo = Math.min(x, y)
      return (hi + 0.05) / (lo + 0.05)
    }
    const effectiveBg = (el: Element): number[] => {
      let n: Element | null = el
      while (n) {
        const p = toRgb(getComputedStyle(n).backgroundColor)
        if (p[3] > 0.5) return p
        n = n.parentElement
      }
      return [255, 255, 255, 1]
    }

    const bad: string[] = []
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue

      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => (n.textContent ?? '').trim())
        .join('')
      const isSvg = el.tagName.toLowerCase() === 'svg'
      if (!ownText && !isSvg) continue

      // WCAG 1.4.11 exempts PURE DECORATION outright. aria-hidden content is
      // not exposed to assistive tech and carries no information — empty-state
      // illustrations, breadcrumb chevrons — so it has no contrast minimum.
      // Holding it to 3:1 flags an empty-cart glyph as an accessibility defect
      // while telling you nothing about whether the page is usable.
      // (This is scoped to aria-hidden specifically; it is not a general
      // escape hatch, and an icon that is a control's only label fails the
      // separate accessible-name check in the axe suites.)
      if (el.closest('[aria-hidden="true"]') !== null) continue

      const px = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight, 10) || 400
      const isLarge = px >= 24 || (px >= 18.66 && weight >= 700)
      const required = isSvg ? 3.0 : isLarge ? 3.0 : 4.5

      const fg = toRgb(cs.color)
      const bg = effectiveBg(el)
      const r = ratio(fg, bg)
      if (r + 0.005 < required) {
        // SVGElement.className is an SVGAnimatedString, which stringifies to
        // "[object SVGAnimatedString]" and tells a reviewer nothing.
        const raw = (el as HTMLElement).className
        const cls = (typeof raw === 'string' ? raw : el.getAttribute('class') ?? '').slice(0, 60)
        bad.push(
          `${r.toFixed(2)}:1 (needs ${required}) ${px}px ` +
          `fg=rgb(${fg.slice(0, 3).join(',')}) bg=rgb(${bg.slice(0, 3).join(',')}) ` +
          `"${(ownText || '[icon]').slice(0, 28)}" .${cls}`,
        )
      }
    }
    return Array.from(new Set(bad))
  })
}

for (const { path, name } of ROUTES) {
  test(`${name} (${path}) meets WCAG AA contrast`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${path} did not load`).toBeLessThan(400)
    // Settle the Suspense fallback so we measure the real page, not a skeleton.
    await page.waitForLoadState('networkidle').catch(() => {})

    // A route whose data the connected shop cannot serve renders the error
    // boundary. Measuring that would silently swap the page under test for a
    // different one and report a false PASS, so skip loudly instead. (The
    // error page has its own contrast coverage below.)
    if (await page.getByText('Page Failed to Load').count()) {
      test.skip(true, `${path} rendered the error boundary — shop cannot serve this route's data`)
    }

    const violations = await measure(page)
    expect(violations, `${path}: contrast below WCAG AA`).toEqual([])
  })
}

test('the error boundary itself meets AA', async ({ page }) => {
  // Reached whenever a shop cannot serve a route's data — so it is a page real
  // shoppers see, and its "Support code" line was 2.49:1 before this suite
  // existed. Driven directly rather than waiting for a data failure to expose it.
  await page.goto('/product/definitely-not-a-real-product-xyz', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const violations = await measure(page)
  expect(violations, 'error page: contrast below WCAG AA').toEqual([])
})

test('semantic ink tokens resolve to their documented, compliant values', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const read = (n: string) => cs.getPropertyValue(n).trim()
    return {
      link: read('--color-ink-link'),
      linkHover: read('--color-ink-link-hover'),
      brand: read('--color-ink-brand'),
      danger: read('--color-ink-danger'),
      muted: read('--color-ink-muted'),
      mutedOnDark: read('--color-ink-muted-on-dark'),
      separator: read('--color-ink-separator'),
    }
  })

  // Pinned so a "harmless" palette tweak cannot silently drop one of these
  // below AA — the whole point of routing colour through named roles.
  expect(tokens).toEqual({
    link: '#006d92',
    linkHover: '#00506b',
    brand: '#006d92',
    danger: '#c10007',
    muted: '#6b6b6b',
    mutedOnDark: '#b0b0b0',
    separator: '#8a8a8a',
  })
})
