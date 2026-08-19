# SDD ledger — plan: docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md

## Setup

- Working in place on branch `catalog-cro-review-sardor-dev` (user declined an
  isolated worktree — 3 pre-existing uncommitted doc files from prior session
  work remain untouched and out of scope for this plan).
- Baseline verified clean before Task 1: `npm test` → 146/146 files, 1494/1494
  tests passing.
- Spec: Bilal's 2026-08-18 Slack message (pasted into the session, no separate
  spec file) — the plan document itself carries the spec text inline per its
  own "Spec:" header. No separate spec doc to cross-check against.

## Pre-flight conflict scan

| Pair / Task | What's shared | Finding |
|---|---|---|
| Task 1 (filter-registry.ts) vs others | — | No other task touches `lib/filter-registry.ts`. Clean. |
| Task 2 vs Task 10 vs Task 11 | `proxy.ts`, `__tests__/proxy.test.ts` | All three add/read `REDIRECT_ENTRIES`. Plan order (2 → 10 → 11) is correct: Task 11's audit script must run after both hand-written entries exist so it reports on the final state, not a partial one. Serial dispatch (this skill never parallelizes implementers) makes this safe as long as task order is preserved — ruling: preserve plan order exactly, do not reorder for convenience. |
| Task 4 vs Task 6 vs Task 8 | `components/product/ProductView.tsx`, `ProductView.test.tsx` | Three different sections of the same file (You May Also Need block / RETURNS tab / ORDER PACKAGING tab) and its test file. No logical overlap in the sections touched. Serial dispatch means each starts from the prior task's committed HEAD — safe in plan order (4 → 6 → 8). |
| Task 7 vs Task 4/6/8 | `ProductView.test.tsx` (Task 7 Step 3 may add a fixture-based test here) | Task 7 runs after 4 and 6, before 8, in plan order — starts from Task 6's committed state. No conflict as long as order is preserved. |
| Task 5 (cart.ts, types.ts, CartPopup.tsx, CartPageClient.tsx) | — | No other task touches these files. Clean. |
| Task 3 (nav component, TBD file) | — | Task 1 doesn't touch nav; no overlap. The nav file itself is unknown until Task 3's own Step 1 investigates — this is an intentional investigation-gated task, not a plan defect. |
| Task 9 (homepage/search, e2e) | — | No overlap with any other task's files. Clean. |
| Task 12 (docs only) | — | Depends on all prior tasks' outcomes but touches no shared code file. Clean, must run last (already last in plan order). |
| Self-consistency: Task 3 | Conditional steps ("skip if Step 1 finds no gap") | Intentional — the task cannot know ahead of time whether a code change is needed until its own investigation runs. Not a defect; implementer instructed to record the finding either way. |
| Self-consistency: Task 6 | Fixture assumes Shopify bold-mark shape `{ type: 'text', value, bold: true }` | Plan text itself flags this as unverified and instructs the implementer to confirm against real QA data before trusting the fixture (Step 1's parenthetical). Flagged here as a risk to watch in review, not a conflict — ruling: if the implementer's real-data check finds a different mark shape, they are authorized to adjust the fixture/type to match reality; this is expected, not a plan violation. |
| Global Constraints vs all tasks | "no push/PR/deploy without go-ahead" | Every task's Step N commit is `git commit` only, never `git push`. Consistent throughout. |

**Scan result:** no true contradictions found. All shared-file cases are resolved by preserving plan task order (already the dispatch order below) rather than reordering for convenience. One flagged risk (Task 6 mark-shape assumption) is pre-authorized to self-correct against real data.

## Task log

Note (2026-08-19): `catalog-cro-review-sardor-dev` was rebased onto a
concurrent push from another session (`7a6c276`, "P0.5 shipping copy
cleanup, Vendor Shipping & Returns tab rename, Backorder ETA, AeroWalk
redirect" — touched `proxy.ts` and `ProductView.tsx`, overlapping with Tasks
2 and 4). The rebase applied cleanly with no textual conflicts; re-ran the
full suite + `tsc` post-rebase (145 files/1497 tests green, both feature
sets independently grepped and confirmed present) before pushing. All commit
SHAs below and in the handoff doc were rewritten by the rebase — mapping:
`3ff3fa2`→`f04974e` (Task 1), `5333f19`→`a1e5ae2` (Task 2), `9d1e377`→`b5d2fcd`
(Task 4), base `75a92d8`→`7a6c276`. Corrected below.

Task 1: complete (commits 7a6c276..f04974e, review clean)
Task 2: complete (commits f04974e..a1e5ae2, review clean)
Task 3: minor (deferred): nav entry is labeled "Surgery & Procedure" not "Trocar Supplies" — display name is client-approved copy (lib/category-tree.ts:52-56), a client-copy decision not a dev fix; the underlying destination/position are correct (verified: always-visible primary group, direct resolution to /category/trocars-trocar-kits, no alphabetical sort exists anywhere in the nav pipeline).
Task 3: complete (no commits — verification only; brief's premise about which file builds the live nav was wrong, corrected and independently re-verified by reviewer; review clean)
Task 4: minor (deferred): manual browser walkthrough (brief Step 5, both PDP routes/breakpoints) not performed — claude-in-chrome reported "not connected" in this environment. Automated RTL/a11y tests fully cover the link-swap behavior (role, href, focus, no nested button) per reviewer's judgment, but a human/tooled spot-check on a live PDP is still recommended before launch — carry into Task 12's evidence doc checklist.
Task 4: minor (deferred): no axe/jest-axe wired into the vitest component suite for a11y testing (only Playwright e2e has @axe-core/playwright, e.g. e2e/axe.spec.ts) — brief assumed one existed. Worked around correctly with role/focus assertions matching the file's real existing idiom; wiring real axe into vitest is a separate backlog item, not this plan's scope.
Task 4: complete (commits a1e5ae2..b5d2fcd, review clean)

## Plan amendment (2026-08-19)

Bilal sent a follow-up Slack message ("final direction... complete the
remaining work today") that adds Sardor-relevant scope on top of the
original plan. Folded into the plan file as new Tasks 13-14, plus an
addendum note under "Spec". Ruling: append new tasks rather than renumber
1-12, to keep this ledger's existing completion lines valid and avoid
re-triggering already-clean reviews.

- Ruling: RX Only capitalization (in Bilal's "please finish or confirm"
  list) needs no dev task — grepped the full non-doc codebase, confirmed
  `lib/labels/labels.ts:48-51` already fixed this sitewide to "Rx Only"
  under H-04 (2026-08-13), no live component renders the all-caps form.
  Downgraded to a Task 12 confirm-only checklist line. Cost if wrong: a
  missed capitalization bug ships; low risk given the grep found zero
  matches outside docs/plans.
- Ruling: B9802 Combo's single-value Features filter is explicitly
  client-requested per Bilal — left untouched, not treated as a data gap
  to "fix" in any task. No code implication (Task 1's generic per-product
  facet rendering already handles a product with one Features value
  correctly; nothing to change).
- New Task 13: nav needs an explicit, visible "Trocar Supplies" quick link
  under "Surgery & Procedure" — Task 3's no-op conclusion covered
  destination-correctness only, not this distinct visible-label
  requirement Bilal is now making explicit.
- New Task 14: investigate (read-only, live Storefront query) whether the
  Trocar Category facet actually returns pipe-joined combined labels for
  the 4 dual-category products; implement a display-only split in
  `getAllowedFacets` only if the investigation confirms it's real — mirrors
  the plan's existing investigate-before-implementing pattern (Tasks 9/10).

Task 5: complete (commits 4ba650e..3f4ddc4, review clean)

Task 6: minor (deferred): `splitSpansOnBlankLines` (new helper in lib/policy/rich-text.ts) doesn't `.trim()` each split piece the way `resolveReturnPolicy` does — a leading `\n` can survive into a span's text; cosmetically inert (HTML whitespace collapse) but a small asymmetry with the plain-text sibling function. Not worth a fix round per reviewer.
Task 6: complete (commits 3f4ddc4..2b2be43, review clean)

Task 7: fix round 1/5 (2 addressed — task-7-report.md written; 0 addressed of grep-methodology relabel, 1 open — 2 of 5 citations still mislabeled; commits f6a8ba8..bdac253)
Task 7: fix round 2/5 (1 addressed — full pass found and fixed the 2 remaining plus a 3rd previously-unflagged mislabel; commits bdac253..c2cf1a5)
Task 7: complete (commits 2b2be43..c2cf1a5, review clean after 2 fix rounds — no bypass found on any of the 7 Free Shipping display surfaces; Dukal-inside-OCC positive-path real-product spot-check left unverified due to QA-registry data coverage, not a code gap)

Task 8: minor (deferred, open question for Bilal — not a defect): current fallback copy is "Packaging information not available for this product." vs. Bilal's requested "Packaging information unavailable for this option." — differs in "not available"/"unavailable" and "for this product"/"for this option". Deliberately NOT rewritten (product-copy decision, needs client confirmation). Carry into Task 12's evidence doc as a one-line question back to Bilal.
Task 8: complete (commits c2cf1a5..82d1195, review clean)

Task 9: complete (commits 82d1195..325120a, review clean — reviewer independently reproduced the pre-fix overflow by checking out the old file versions, confirming root cause)

Task 10: minor (deferred to Task 11): 3 sibling Drape Sheet rows in the 1,285-row docs/redirects-ready.json bulk file (40x90, 40x60, 40x48, all White→Blue) share the same dead-destination-handle defect as the one fixed in proxy.ts's hand-written entry — out of this task's stated scope (bulk-file fixes belong to Task 11's full audit), flagged for that task to catch.
Task 10: complete (commits 325120a..c9906e6, review clean — reviewer independently confirmed the AeroWalk redirects-ready.json rows and the PRODUCT_REDIRECTS rewrite logic, not just the report's claim)

Task 11: minor (deferred, FYI only): the "10,001+ products" production catalog figure cited in the audit report's environment caveat is inferred from a metafield-population-count doc (docs/launch/2026-08-14-status-and-screenshot-checklist.md), not a stated total catalog size — the "+" suffix correctly signals it's a lower bound, no fix needed.
Task 11: minor (deferred, FYI only): an earlier doc (Task 7's docs/launch/2026-08-18-free-shipping-verification.md) claims the QA store is "a full clone" of production; Task 11's full paginated enumeration (1,088 live QA products) empirically contradicts that. Task 11's number is the more rigorous one — Task 12 should not treat both claims as consistent when writing the final evidence doc.
Task 11: fix round 1/5 (1 addressed — task-11-report.md written; commits 6cc6fff..450e163)
Task 11: complete (commits c9906e6..450e163, review clean — 1,313 redirect entries checked exhaustively; hand-written proxy.ts set 100% clean; bulk-file 404 rate is a QA-vs-production store data mismatch, not confirmed breakage, prominently caveated in the report; 3 genuinely-dead sibling Drape Sheet rows fixed via TDD; production re-run recommended as a pre-launch follow-up — carry into Task 12)

Task 13: minor (deferred, Task 12 checklist item): manual browser walkthrough (visible-without-scrolling, live click-through on both desktop mega-menu and mobile drawer) not performed — claude-in-chrome reported "not connected" again, same as Tasks 4/9. Covered by automated accessible-name/href/placement assertions instead. Carry into Task 12.
Task 13: complete (commits 450e163..5304619, review clean)

Task 14: minor (deferred, Task 12 checklist item): client's specific "four Trocar products with multiple categories" scenario was not reproducible in this environment's QA-store data (24 category-facet counts across 40 products, i.e. no product currently appears in more than one Category value here) — the structural question (does the facet ever emit a pipe-joined combined label) is answered "no" on all reachable data, and reviewer independently re-ran the script and reproduced the exact same numbers, but the client's specific claim needs a production re-check before being called fully resolved. Script committed (`scripts/verify-trocar-category-pipe-labels.ts`) specifically so Task 12 (or a pre-launch step) can re-run it against production credentials.
Task 14: fix round 1/5 (1 addressed — investigation script committed; commits 5304619..be922f0)
Task 14: complete (commits 5304619..be922f0, review clean — verified no-op, no lib/filter-registry.ts change needed on current evidence)

## All 14 tasks complete. Dispatch Task 12 (final QA pass, evidence doc) next — this is the last task, deliberately run after 13-14 since it's the final joint-acceptance pass that must reflect their outcomes too. (5 → 6 → 7 → 8 → 9 → 10 → 11
→ 12 → 13 → 14, preserving original file-conflict-safe order for 1-12;
13-14 are new and independent of the others' shared files — 13 touches
Header.tsx only, 14 touches filter-registry.ts only, both already-audited
clean of conflicts in the original scan).
