# Clean-Fix Completion Report — 2026-07-30

## Executive summary

Every technically achievable item in the Clean-Fix Execution Plan (2026-07-22)
that was outstanding has been implemented, tested, and committed on a dedicated
branch. **Release candidate status: READY WITH DOCUMENTED EXTERNAL BLOCKERS.**

Four tickets that prior audits reported as missing are now complete
(DEV-POLICY-01, DEV-SEARCH-01, DEV-OCC-01, DEV-ACCOUNT-01). One ticket that
prior audits reported as **complete was found still shipping its own defect**
(DEV-NAV-01) and is now fixed and pinned by a regression test. DEV-LABEL-01
remains BLOCKED on a vendor answer, with all internal engineering, a fail-safe
provider, and a documented unblock path delivered.

Every customer-facing liability item named in the plan is resolved: the blanket
30-day return promise, the OCC payment-terms claim, "In stock" claims, the raw
`free-shipping` tag badge, and the unsourced performance/count claims are all
gone from rendered output, each guarded by a source-scanning test.

## Repository state

| | |
|---|---|
| Branch | `fix/complete-clean-fix-plan-2026-07-30` |
| Backup branch | `backup/pre-clean-fix-completion-2026-07-30` (@ `739125c`) |
| Base commit | `739125c` |
| Upstream | `origin/main` @ `a49df32` — untouched |
| Diff | 59 files changed, +2636 / −440 |
| Deployed | **No** |
| Merged | **No** |
| Pushed to `main` | **No** |

Prior stashes (`stash@{0..2}`) and all audit artifacts were preserved. No
history was rewritten; no `reset --hard`, no `clean -fd`.

## Commits

| Commit | Scope |
|---|---|
| `0291c6f` | `fix(policy)` — approved return policy, remove conflicting claims |
| `236aa73` | `feat(search)` — collection-scoped search with URL state |
| `b805ba0` | `feat(occ)` — complete canonical OCC catalog experience |
| `d1190d6` | `feat(account)` — item-level partial fulfillment details |
| `7796fd8` | `refactor(labels)` — normalized label contract, safe precedence |
| `0642b65` | `fix(catalog)` — remove stock claims and unsafe tag fallbacks |
| `5fdf7f6` | `fix(claims)` — suppress unsupported performance/catalog claims |
| `8f14a3f` | `fix(categories)` — enforce approved category image coverage |
| `71e1b65` | `fix(rx)` — checkout enforcement behind a fail-safe flag |
| `b56d63c` | `fix(nav)` — Needles/Syringes routes to its L1 page |

## Architecture decisions

1. **One registry per concern.** Policy copy (`lib/policy/return-policy.ts`),
   labels (`lib/labels/labels.ts`), claims (`lib/claims.ts`), and the OCC
   collection identity (`lib/occ-collection.ts`) each have a single source of
   truth, mirroring the plan's registry principle. Components render from them
   and never carry their own wording.
2. **Search scoping is server-side and dual-path.** Registry-backed collections
   scope by their category tag; collections without a registry scope (OCC)
   intersect search hits with the canonical collection's product-ID set — so OCC
   membership comes from the collection, never from tag scanning. User input is
   sanitized so it cannot inject field filters or boolean operators.
3. **Claims are opt-in, not opt-out.** A claim renders only with `approved`
   **and** `source` **and** `evidenceDate`. Unapproved claims render nothing;
   no replacement figures were invented.
4. **Nav trusts the reviewed registry over live-list reconciliation.** A
   validated canonical route may never degrade to the generic page — that
   inversion is what caused the DEV-NAV-01 regression.
5. **Fulfillment math is pure and total.** `computeFulfillmentSummary()` is
   side-effect free and clamps at zero, so no rendering path can produce a
   negative or double-counted remainder.

## Test results

| Check | Result |
|---|---|
| `npm test` | **1074 passed / 115 files** (baseline 995 / 108; +79 tests) |
| `npx tsc --noEmit` | Pass |
| `npx eslint --max-warnings 0` | Pass (exit 0) |
| `npm run build` | Pass (exit 0) |

Rendered/manual verification is itemised in
[`clean-fix-qa-report-2026-07-30.md`](clean-fix-qa-report-2026-07-30.md),
including the live search-scoping proof and the honest list of what was **not**
verified (cross-browser, responsive screenshots, partial-shipment end-to-end).

## Known external blockers

| # | Blocker | Impact | Safe fallback in place | Owner |
|---|---|---|---|---|
| 1 | Fordeer headless retrieval path unproven | DEV-LABEL-01 cannot be PASS | Provider disabled; tag/metafield labels only; no unsupported claim | Izzy + vendor |
| 2 | OCC canonical count not signed off | Count reconciliation unverified | `occ` handle verified live and rendering | Izzy |
| 3 | Vendor-specific return data not populated | PDP shows general policy only | Approved general fallback, never empty | Izzy |
| 4 | No controlled partial-fulfillment order | End-to-end account proof pending | Math unit-tested across all §8.4 cases | Izzy |
| 5 | Claims evidence not supplied | Stats bars stay hidden | Claims render nothing | Client |
| 6 | RX compliance decision outstanding | Enforcement stays off | Flag disabled by default; tests prove it cannot block | Client |
| 7 | Dukal threshold / rate verification | Shipping resolver stays off | Neutral "Shipping calculated at checkout." | Izzy |
| 8 | Independent QA reviewer | DEV-QA-01 PARTIAL | Full matrix + evidence prepared | Head developer |

Release can proceed **excluding** every blocked feature: each one is either
flagged off or renders a neutral state, so none of them gates the rest.

## Remaining launch risks

- Cross-browser and responsive verification is outstanding; changes were
  structural (conditional rendering) rather than layout rewrites, which lowers
  but does not eliminate the risk.
- The header stats bar and the account stats section now render nothing. This is
  intentional and correct, but it is a visible design change the client should
  see before launch.
- The OCC page is now dynamic (it reads `searchParams`), so it no longer
  benefits from route-level ISR. Freshness comes from fetch-level cache tags.

## Rollback

- Revert the branch, or reset to `backup/pre-clean-fix-completion-2026-07-30`.
- No migrations, no data backfills, no Shopify configuration changes.
- All new flags default to off, so an environment that ignores them behaves as
  documented here.
