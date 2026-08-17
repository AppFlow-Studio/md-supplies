// DEV-POLICY-01 — the single authoritative source for customer-facing return
// policy copy. Every surface that mentions returns (the /returns page, the
// FAQ, the PDP Returns tab) renders from this module; no other file may carry
// its own return-policy wording (enforced by lib/__tests__/policy-copy.test.ts).
//
// The general copy below is the client-approved text from the Clean-Fix
// Execution Plan §7.2 and must be used VERBATIM. Do not edit, shorten,
// summarize, or paraphrase it without written client approval.

export type ReturnPolicySection = {
  /** null for the lead section that sits under the page-level heading. */
  heading: string | null
  paragraphs: string[]
}

export const RETURN_POLICY_TITLE = 'Return Policy'

export const RETURN_POLICY_SECTIONS: ReturnPolicySection[] = [
  {
    heading: null,
    paragraphs: [
      'Because we partner with multiple vendors and manufacturers, return policies vary by product.',
      'All returns are subject to the return policy of the respective vendor and/or manufacturer that supplies the item.',
      'To view the applicable return policy, please visit the product listing page and select the Returns tab.',
    ],
  },
  {
    heading: 'Return Authorization Required',
    paragraphs: [
      'All return requests must be submitted to and approved by the applicable vendor and/or manufacturer before any item is returned. If a Return Goods Authorization (RGA) number is required by the vendor or manufacturer, it must be obtained prior to shipping the item back.',
      'Any item returned without the required approval and/or a valid RGA number (when applicable) may be refused by the vendor or manufacturer. In these cases, the return will not be accepted, and no refund, credit, or exchange will be issued.',
      'Return eligibility, return timeframes, restocking fees, shipping responsibilities, and other return requirements vary by vendor and manufacturer. We encourage you to review the product-specific return policy before placing your order.',
      'If you have any questions or need assistance initiating a return, please contact our customer support team before sending your item back.',
    ],
  },
]

/** Plain-text rendering for string-only contexts (the FAQ accordion). */
export const RETURN_POLICY_PLAIN_TEXT = RETURN_POLICY_SECTIONS
  .flatMap((s) => (s.heading ? [s.heading, ...s.paragraphs] : s.paragraphs))
  .join('\n\n')

export type ResolvedReturnPolicy = {
  /** 'vendor' only when approved vendor/product-specific copy was supplied. */
  source: 'vendor' | 'general'
  title: string
  sections: ReturnPolicySection[]
}

/**
 * Resolves the policy to show on a PDP Returns tab.
 *
 * Vendor/product-specific policy data comes from `custom.shipping_returns`
 * (H-01, confirmed by Izzy's 2026-08-14 field contract) — see
 * ProductView.tsx's `vendorPolicyText`. Only 10,001 of the catalog's
 * products carry a value, so `vendorPolicyText` is still absent for the
 * rest, and every one of those renders the approved general fallback. The
 * tab is therefore never empty and never invents vendor-specific
 * requirements.
 */
export function resolveReturnPolicy(input?: {
  vendor?: string | null
  vendorPolicyText?: string | null
}): ResolvedReturnPolicy {
  const text = input?.vendorPolicyText?.trim()
  if (text) {
    return {
      source: 'vendor',
      title: RETURN_POLICY_TITLE,
      sections: [
        {
          heading: input?.vendor ? `${input.vendor} Return Policy` : null,
          // Approved vendor copy is stored as plain text; blank lines separate
          // paragraphs. No rewriting — render exactly what was approved.
          paragraphs: text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        },
      ],
    }
  }
  return { source: 'general', title: RETURN_POLICY_TITLE, sections: RETURN_POLICY_SECTIONS }
}
