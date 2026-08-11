import { expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { authenticatedTest, hasCustomerSession, CUSTOMER_SESSION } from './support/customer-session'
import { VIEWPORTS } from './support/viewports'
import { expectNoHorizontalOverflow } from './support/layout-assertions'

authenticatedTest.describe('account (authenticated)', () => {
  authenticatedTest('account overview loads with no axe violations', async ({ authedPage }) => {
    authenticatedTest.skip(!hasCustomerSession, 'set E2E_CUSTOMER_ACCESS_TOKEN/REFRESH_TOKEN/EXPIRES_AT to a live QA customer session')
    const res = await authedPage.goto('/account', { waitUntil: 'domcontentloaded' })
    expect(res?.status(), 'account did not load — session cookies likely expired, refresh them').toBeLessThan(400)
    expect(authedPage.url(), 'redirected to login — not actually authenticated').toContain('/account')

    const results = await new AxeBuilder({ page: authedPage }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(blocking.map((v) => `${v.id} [${v.impact}]`)).toEqual([])
  })

  for (const vp of VIEWPORTS) {
    authenticatedTest(`account overview has no horizontal overflow @ ${vp.name}`, async ({ authedPage }) => {
      authenticatedTest.skip(!hasCustomerSession, 'set E2E_CUSTOMER_ACCESS_TOKEN/REFRESH_TOKEN/EXPIRES_AT')
      await authedPage.setViewportSize({ width: vp.w, height: vp.h })
      await authedPage.goto('/account', { waitUntil: 'domcontentloaded' })
      await expectNoHorizontalOverflow(authedPage, `account @ ${vp.name}`)
    })
  }
})

authenticatedTest.describe('order detail (authenticated)', () => {
  authenticatedTest('order detail loads, has one h1, no axe violations', async ({ authedPage }) => {
    authenticatedTest.skip(!hasCustomerSession || !CUSTOMER_SESSION.orderNumber, 'set E2E_CUSTOMER_* and E2E_ORDER_NUMBER to a real QA order on that account')
    const res = await authedPage.goto(`/account/orders/${CUSTOMER_SESSION.orderNumber}`, { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(400)
    await expect(authedPage.locator('h1')).toHaveCount(1)

    const results = await new AxeBuilder({ page: authedPage }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(blocking.map((v) => `${v.id} [${v.impact}]`)).toEqual([])
  })

  for (const vp of VIEWPORTS) {
    authenticatedTest(`order detail has no horizontal overflow @ ${vp.name}`, async ({ authedPage }) => {
      authenticatedTest.skip(!hasCustomerSession || !CUSTOMER_SESSION.orderNumber, 'set E2E_CUSTOMER_* and E2E_ORDER_NUMBER')
      await authedPage.setViewportSize({ width: vp.w, height: vp.h })
      await authedPage.goto(`/account/orders/${CUSTOMER_SESSION.orderNumber}`, { waitUntil: 'domcontentloaded' })
      await expectNoHorizontalOverflow(authedPage, `order detail @ ${vp.name}`)
    })
  }
})

authenticatedTest.describe('RX document card states (authenticated)', () => {
  authenticatedTest('the account page renders exactly one of none/uploaded/verified, never more than one badge', async ({ authedPage }) => {
    authenticatedTest.skip(!hasCustomerSession, 'set E2E_CUSTOMER_* — RX document state lives on the QA account, not a product fixture')
    await authedPage.goto('/account', { waitUntil: 'domcontentloaded' })
    const verified = authedPage.getByText('Verified', { exact: true })
    const pending = authedPage.getByText('Pending Review')
    const verifiedCount = await verified.count()
    const pendingCount = await pending.count()
    expect(verifiedCount + pendingCount, 'RX document card shows both Verified and Pending badges at once').toBeLessThanOrEqual(1)
  })
})
