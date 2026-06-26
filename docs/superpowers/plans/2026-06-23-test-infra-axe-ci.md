# Test Infrastructure: Component/Integration/E2E/Visual + axe-in-CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the test suite past the current 179 Vitest unit tests (node environment only, no browser, no a11y) into a full layered suite: component tests (Testing Library + jsdom), integration tests, Playwright E2E tests across the 8 ticket routes, Playwright visual regression baselines, and an axe-core accessibility gate wired into both the Playwright suite and a new CI workflow.

**Architecture:** Vitest gains a second, jsdom-based test environment via Vitest's `projects` config (keeping the existing 179 node-environment tests untouched) plus Testing Library for component tests. Playwright is added as a separate, real-browser layer for E2E + visual + axe, since jsdom cannot do real layout/visual diffing or true a11y tree computation. A new GitHub Actions workflow runs lint, typecheck, Vitest, build, and Playwright (including axe) on every push/PR.

**Tech Stack:** Vitest (existing), `@testing-library/react` + `@testing-library/jest-dom` (new), `jsdom` (new), `@playwright/test` (new), `@axe-core/playwright` (new), GitHub Actions (new workflow)

## Global Constraints

- Do not change `vitest.config.ts`'s existing `environment: 'node'` default — the 179 existing tests assume node, and several read files via `fs`/`path` directly. Add jsdom as an additional project, not a replacement.
- Playwright tests run against a real `next dev`/`next build && next start` server — they need `.env.local` (Shopify credentials) to render real data. If those aren't available in CI, the E2E suite should be allowed to skip gracefully rather than fail the whole pipeline (see Task 9's `continue-on-error`-free but env-gated design).
- Routes under test: the same 8 ticket routes used in the other two plans — home, category, PDP, OCC, industry, blog, cart, account.
- No new runtime dependencies (everything new here is a devDependency).

---

### Task 1: Add Testing Library + jsdom for component tests

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install the new devDependencies**

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Convert `vitest.config.ts` to a multi-project config**

Replace the file:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            '__tests__/**/*.test.ts',
            'lib/**/*.test.ts',
            'lib/**/__tests__/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: [
            'components/**/*.test.tsx',
            'components/**/__tests__/**/*.test.tsx',
          ],
        },
      },
    ],
  },
})
```

This keeps every existing `.test.ts` file under the `node` project (unchanged behavior) and routes new `.test.tsx` component tests under `jsdom`.

- [ ] **Step 4: Add an `npm test` script**

In `package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 5: Verify the existing suite still passes under the new config**

```bash
npx vitest run
```
Expected: same pass count as before (179+ tests, now also reporting the `node` project name), no regressions.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "test: add jsdom/Testing Library project to Vitest for component tests"
```

---

### Task 2: First component tests — `QuickAddModal` and `CartPopup`

**Files:**
- Create: `components/product/__tests__/QuickAddModal.test.tsx`
- Create: `components/store/__tests__/CartPopup.test.tsx`

These exercise the focus-trap/dialog/Escape behavior fixed in the accessibility plan — write them assuming that plan's `CartPopup` changes (`role="dialog"`, focus trap, Escape) are already in place; if run before that plan lands, the `CartPopup` test's dialog-role assertions will correctly fail until it does.

- [ ] **Step 1: Write `QuickAddModal.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickAddModal } from '../QuickAddModal'
import type { ProductCardData } from '@/types/product'

const product: ProductCardData = {
  handle: 'test-product',
  title: 'Test Product',
  image: { url: '/test.jpg', altText: 'Test', width: 64, height: 64 },
  brand: 'Test Brand',
  vendor: 'Test Vendor',
  price: 1999,
  sku: 'SKU-1',
  available: true,
  variants: [
    { id: 'v1', title: 'Default', price: 1999, available: true },
  ],
}

describe('QuickAddModal', () => {
  it('renders as a labeled dialog and traps focus inside it', () => {
    const onClose = vi.fn()
    render(<QuickAddModal product={product} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<QuickAddModal product={product} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('close button has type=button', () => {
    const onClose = vi.fn()
    render(<QuickAddModal product={product} onClose={onClose} />)

    expect(screen.getByLabelText('Close quick add')).toHaveAttribute('type', 'button')
  })
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run --project component`
Expected: PASS (3/3) — `QuickAddModal` already implements dialog role + focus trap + Escape pre-ticket.

- [ ] **Step 3: Write `CartPopup.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartPopup } from '../CartPopup'
import { useCart } from '../CartProvider'

vi.mock('../CartProvider', () => ({
  useCart: vi.fn(),
}))

function mockCart(isOpen: boolean) {
  vi.mocked(useCart).mockReturnValue({
    cart: null,
    isOpen,
    openCart: vi.fn(),
    closeCart: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
  } as unknown as ReturnType<typeof useCart>)
}

describe('CartPopup', () => {
  it('exposes dialog semantics when open', () => {
    mockCart(true)
    render(<CartPopup />)

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('is inert (not focusable) when closed', () => {
    mockCart(false)
    render(<CartPopup />)

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-hidden', 'true')
  })

  it('calls closeCart on Escape when open', () => {
    mockCart(true)
    const { rerender } = render(<CartPopup />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(vi.mocked(useCart)().closeCart).toHaveBeenCalled()
    rerender(<CartPopup />)
  })
})
```

- [ ] **Step 4: Run it**

Run: `npx vitest run --project component`
Expected: PASS once the accessibility plan's `CartPopup` dialog-semantics changes (Task 4 of `2026-06-23-a11y-reduced-motion.md`) are in place. If that plan hasn't landed yet, this test documents the target behavior — treat a FAIL here as confirmation the dependency is still pending, not a bug in this test.

- [ ] **Step 5: Commit**

```bash
git add components/product/__tests__/QuickAddModal.test.tsx components/store/__tests__/CartPopup.test.tsx
git commit -m "test: add component tests for QuickAddModal and CartPopup dialog behavior"
```

---

### Task 3: Integration test — add-to-cart flow

**Files:**
- Create: `components/store/__tests__/add-to-cart-flow.test.tsx`

Exercises `CartProvider` + `CartPopup` together (not mocking `useCart` this time) to verify the cart panel reflects state changes end-to-end at the React level, one layer below full-browser E2E.

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CartProvider, useCart } from '../CartProvider'
import { CartPopup } from '../CartPopup'

function OpenCartButton() {
  const { openCart } = useCart()
  return <button type="button" onClick={openCart}>Open</button>
}

describe('cart open/close integration', () => {
  it('opening the cart via context renders the dialog with aria-modal=true', async () => {
    render(
      <CartProvider initialCart={null}>
        <OpenCartButton />
        <CartPopup />
      </CartProvider>,
    )

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-modal', 'false')

    await act(async () => {
      screen.getByText('Open').click()
    })

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-modal', 'true')
  })
})
```

Adjust the import of `useCart`/`CartProvider`'s exact exported shape by reading `components/store/CartProvider.tsx` first if `openCart` isn't a context value exposed the same way — match whatever the real hook returns rather than guessing further.

- [ ] **Step 2: Run it**

Run: `npx vitest run --project component`
Expected: PASS (1/1).

- [ ] **Step 3: Commit**

```bash
git add components/store/__tests__/add-to-cart-flow.test.tsx
git commit -m "test: add integration test for cart open/close flow across CartProvider + CartPopup"
```

---

### Task 4: Install and configure Playwright

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install Playwright and its browsers**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Chromium only (not all 3 engines) keeps CI time and disk usage down; the ticket's targets (Lighthouse mobile, axe) are Chromium-based checks anyway.

- [ ] **Step 2: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      },
})
```

Setting `E2E_BASE_URL` lets the suite point at a deployed production candidate instead of building/starting locally — reuse this for the "re-run against the real candidate" step the other two plans call for.

- [ ] **Step 3: Add npm scripts**

In `package.json` `"scripts"`:
```json
    "test:e2e": "playwright test",
    "test:e2e:update-snapshots": "playwright test --update-snapshots"
```

- [ ] **Step 4: Add Playwright artifacts to `.gitignore`**

Append:
```
# playwright
/test-results/
/playwright-report/
/playwright/.cache/
```

- [ ] **Step 5: Create a placeholder spec to verify the harness works**

```typescript
// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test('homepage responds and renders an H1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveCount(1)
})
```

- [ ] **Step 6: Run it**

```bash
npm run test:e2e
```
Expected: PASS — this spins up `next build && next start` per `webServer` config (first run will take a while) and confirms one `<h1>` on the homepage.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json playwright.config.ts .gitignore e2e/smoke.spec.ts
git commit -m "test: install and configure Playwright; add smoke spec"
```

---

### Task 5: E2E specs for all 8 ticket routes

**Files:**
- Create: `e2e/routes.spec.ts`

Smoke-level checks per route: loads with a 2xx, has exactly one `<h1>`, has no console errors, and the route's primary CTA is present and clickable. Cart/account need a small amount of route-specific setup since cart is opened via a UI action and account has logged-out vs. logged-in states.

- [ ] **Step 1: Write the test**

```typescript
// e2e/routes.spec.ts
import { test, expect } from '@playwright/test'

const STATIC_ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/category/gloves', name: 'category' },
  { path: '/product/nitrile-exam-gloves-powder-free', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacy', name: 'industry' },
  { path: '/blog/types-of-needles', name: 'blog' },
  { path: '/account', name: 'account' },
]

for (const { path, name } of STATIC_ROUTES) {
  test(`${name} (${path}) loads with exactly one h1 and no console errors`, async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const response = await page.goto(path)
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(consoleErrors).toEqual([])
  })
}

test('cart panel opens from the header and traps focus', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /cart/i }).click()
  const dialog = page.getByRole('dialog', { name: /shopping cart/i })
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveAttribute('aria-modal', 'false')
})
```

Replace the `/category/gloves` and `/product/nitrile-exam-gloves-powder-free` slugs with real handles from the connected Shopify store if those don't exist — check `app/category/[slug]/page.tsx`'s data source or query the storefront directly before running.

- [ ] **Step 2: Run it**

```bash
npm run test:e2e
```
Expected: PASS for all 8 routes. If `/account` redirects to `/account/login` for logged-out visitors, adjust the `account` case to assert on the login page's `h1` instead — read `components/account/AccountView.tsx`'s logged-out branch first to confirm the actual heading text before writing the assertion.

- [ ] **Step 3: Commit**

```bash
git add e2e/routes.spec.ts
git commit -m "test(e2e): add smoke coverage for all 8 ticket routes plus cart focus-trap check"
```

---

### Task 6: Visual regression baselines

**Files:**
- Create: `e2e/visual.spec.ts`

Playwright's `toHaveScreenshot()` for the routes whose layout doesn't depend on logged-in/cart state (home, category, PDP, OCC, industry, blog). Cart and account are excluded — their content depends on session/cart state, which makes screenshot baselines flaky/non-deterministic across runs unless seeded, which is out of scope here.

- [ ] **Step 1: Write the test**

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test'

const VISUAL_ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/category/gloves', name: 'category' },
  { path: '/product/nitrile-exam-gloves-powder-free', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacy', name: 'industry' },
  { path: '/blog/types-of-needles', name: 'blog' },
]

for (const { path, name } of VISUAL_ROUTES) {
  test(`${name} visual baseline`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    })
  })
}
```

- [ ] **Step 2: Generate the baseline screenshots**

```bash
npm run test:e2e:update-snapshots -- e2e/visual.spec.ts
```
Expected: creates `e2e/visual.spec.ts-snapshots/*.png` — these are the baseline; review each image manually once to confirm it shows a correctly rendered page (not an error/loading state) before committing.

- [ ] **Step 3: Run it again to confirm it's stable**

```bash
npm run test:e2e -- e2e/visual.spec.ts
```
Expected: PASS — no diff against the baseline just generated.

- [ ] **Step 4: Commit**

```bash
git add e2e/visual.spec.ts e2e/visual.spec.ts-snapshots
git commit -m "test(e2e): add visual regression baselines for home, category, PDP, OCC, industry, blog"
```

---

### Task 7: axe-in-CI — accessibility gate in the Playwright suite

**Files:**
- Modify: `package.json`
- Create: `e2e/axe.spec.ts`

This is the permanent, CI-enforced counterpart to the one-off `scripts/run-axe-audit.sh` from the accessibility plan — same 8 routes, but asserted as a hard pass/fail gate instead of a report to read manually.

- [ ] **Step 1: Install `@axe-core/playwright`**

```bash
npm install -D @axe-core/playwright
```

- [ ] **Step 2: Write `e2e/axe.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/category/gloves', name: 'category' },
  { path: '/product/nitrile-exam-gloves-powder-free', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacy', name: 'industry' },
  { path: '/blog/types-of-needles', name: 'blog' },
  { path: '/cart', name: 'cart' },
  { path: '/account', name: 'account' },
]

for (const { path, name } of ROUTES) {
  test(`${name} (${path}) has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      console.log(`axe violations on ${name}:`, JSON.stringify(blocking, null, 2))
    }
    expect(blocking).toEqual([])
  })
}

test('cart panel (opened) has no serious or critical axe violations', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /cart/i }).click()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(blocking).toEqual([])
})
```

Scoping to `serious`/`critical` (not `minor`/`moderate`) makes this a meaningful CI gate without it becoming so strict that unrelated future findings block every PR — moderate/minor findings should still be tracked, just via `audit/AXE-REPORT.md`, not a hard CI failure.

- [ ] **Step 3: Run it**

```bash
npm run test:e2e -- e2e/axe.spec.ts
```
Expected: PASS once the accessibility plan's fixes (main-content ids, breadcrumb ARIA, dialog semantics, button types) are in place. Run the accessibility plan first if this fails with real violations — that's the dependency this test is designed to catch.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json e2e/axe.spec.ts
git commit -m "test(e2e): add axe-core accessibility gate for all 8 ticket routes + cart panel"
```

---

### Task 8: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

No existing GitHub Actions workflow in this repo — this is the first one. Runs lint, typecheck, Vitest, build, and the Playwright suite (E2E + visual + axe) on every push and PR. Playwright needs the Shopify env vars to render real pages; the job reads them from repository secrets and skips the E2E job gracefully if they're absent (so forks/PRs without secrets access don't hard-fail).

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, sardor-dev]
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    needs: unit
    env:
      SHOPIFY_STORE_DOMAIN: ${{ secrets.SHOPIFY_STORE_DOMAIN }}
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: ${{ secrets.SHOPIFY_STOREFRONT_ACCESS_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Skip E2E if Shopify secrets are not configured
        id: gate
        run: |
          if [ -z "$SHOPIFY_STORE_DOMAIN" ]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
          else
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi
      - run: npx playwright install --with-deps chromium
        if: steps.gate.outputs.skip == 'false'
      - run: npm run build
        if: steps.gate.outputs.skip == 'false'
      - run: npm run test:e2e
        if: steps.gate.outputs.skip == 'false'
      - uses: actions/upload-artifact@v4
        if: failure() && steps.gate.outputs.skip == 'false'
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 2: Add the required repository secrets**

This step is manual and happens in GitHub's UI, not in code — document it rather than execute it:

```
gh secret list
# If SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_ACCESS_TOKEN aren't listed, add them:
gh secret set SHOPIFY_STORE_DOMAIN
gh secret set SHOPIFY_STOREFRONT_ACCESS_TOKEN
```

Confirm with the user/repo owner before running `gh secret set` — it requires pasting real credentials into a prompt, which should be a deliberate, explicit action, not an automated one.

- [ ] **Step 3: Commit the workflow**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for lint, typecheck, Vitest, build, and Playwright (incl. axe)"
```

- [ ] **Step 4: Verify by pushing and checking the Actions tab**

```bash
git push
gh run watch
```
Expected: `unit` job green. `e2e` job green if secrets are configured, or cleanly skipped (no failure) if not.

---

### Task 9: Final verification

- [ ] **Step 1: Run the full Vitest suite (both projects)**

```bash
npx vitest run
```
Expected: all `node` + `component` tests pass.

- [ ] **Step 2: Run the full Playwright suite**

```bash
npm run test:e2e
```
Expected: all E2E, visual, and axe specs pass.

- [ ] **Step 3: Run build + typecheck one more time**

```bash
npm run build
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Confirm CI is green on the pushed branch**

```bash
gh run list --limit 1
```
Expected: latest run status is `success` (or `e2e` legitimately skipped per Task 8 if secrets aren't set).
