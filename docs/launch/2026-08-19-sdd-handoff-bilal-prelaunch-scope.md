# Handoff — subagent-driven execution of Bilal's final pre-launch scope — 2026-08-19

Paste this whole file as the opening message of a new session (any machine) to
resume this work with full context.

## What this is

Continuation of the same launch (repo `md-supplies`, Shopify headless
storefront, Next.js App Router — `AGENTS.md` warns this Next.js build has
breaking changes from training data, read `node_modules/next/dist/docs/`
before writing Next-specific code). This thread started from **Bilal's
2026-08-18 "final pre-launch scope" Slack message** (the client brought up
new items before launch: OCC/Trocar Supplies handling, a dedicated Trocar
landing page, packaging-display safety, Free Shipping display rules, a full
redirect audit, and several known bug fixes) plus **Izzy's 2026-08-18 9:40 PM
message** supplying the Trocar filter registry (41 active products, verified
metafield coverage — CSV at `C:\Users\sarik\Downloads\TROCAR-REGISTRY-41-PRODUCTS.csv`
on the machine this was drafted on, not in the repo).

**Izzy's Shopify-catalog-write tasks (LG-04 audit reconciliation, Free
Shipping metafield writes, bulk-op userError checks) are explicitly OUT OF
SCOPE for this plan.** `lib/shopify/admin.ts`'s token is comment-scoped to
customer read/write only (the RX gate) — it has no product/metafield access.
Those are Izzy's, done in the Shopify Admin UI, not this codebase. The user
confirmed this scoping decision explicitly at the start of this thread.

This is a **separate, earlier, still-open thread**: `docs/launch/2026-08-17-*.md`
(session-handoff, task-triage-and-izzy-response, qa-evidence-and-production-readiness)
document prior work — H-01 Vendor Shipping & Returns, the AeroWalk QA pilot,
LG-04 packaging breakdown — some of which is now superseded/extended by this
plan's Tasks 6 and 8. Those three files were uncommitted from that prior
session; **they are committed in the same commit as this handoff** (see
below) so nothing from that session is lost, but their own TODOs (the 10
corrected-variant-name products, P0.5 Bilal disambiguation, etc.) are not
re-tracked here — read that trio directly if you need that older context.

## The plan and how to resume

**Plan file:** `docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md`
— 12 tasks, full TDD steps, Global Constraints section (no Shopify writes, no
push without explicit go-ahead *for code changes* — pushing this handoff
commit itself was explicitly authorized by the user for continuity, see
below).

**Execution method:** superpowers:subagent-driven-development — fresh
implementer subagent per task, a task-scoped reviewer after each, ledger
tracks state so a new session doesn't need to remember anything from this
one.

**Ledger:** `.superpowers/sdd/2026-08-18-bilal-final-prelaunch-scope/progress.md`
— normally gitignored scratch (`.superpowers/` is in `.gitignore`), but **this
one plan's workspace directory was force-added to this handoff commit**
(`git add -f`) specifically so the ledger, task briefs, implementer reports,
and review-package diffs travel with the branch to the new machine/session
intact — you should not need to regenerate anything to resume; the skill's
own resume logic (`subagent-driven-development` skill, "Setup" section) reads
this ledger automatically: *"tasks with a `Task <N>: complete` line are DONE
— do not re-dispatch them; resume at the first task without one."*

**To resume:** in the new session, say you want to continue executing this
plan with subagent-driven development. Point at the plan file above. The
skill will find the ledger, see Tasks 1-4 complete, and dispatch Task 5 next.
If for any reason the ledger/workspace didn't transfer (e.g. a fresh clone
that dropped it despite the force-add — verify with
`git show --stat HEAD -- .superpowers/sdd/2026-08-18-bilal-final-prelaunch-scope/`
first), the Task log below has everything needed to reconstruct it manually.

## Status: Tasks 1-4 of 12 complete, reviewed clean

Branch: `catalog-cro-review-sardor-dev`. Worked in place (no isolated
worktree — user declined one at setup, this checkout already had 3
uncommitted docs from the prior 08-17 session sitting on it).

| # | Task | Status | Commits | Review |
|---|---|---|---|---|
| 1 | Trocar filter-registry fix (`lib/filter-registry.ts`) | ✅ complete | `f04974e` | clean |
| 2 | `/collections/trocars-trocar-kits` → `/category/trocars-trocar-kits` redirect (`proxy.ts`) | ✅ complete | `a1e5ae2` | clean |
| 3 | Trocar nav quick-link / SEO-schema verification | ✅ complete (no-op) | none — verification only | clean |
| 4 | Fix non-clickable "You May Also Need" cards (`ProductView.tsx`) | ✅ complete | `b5d2fcd` | clean |
| 5 | Fix wrong variant image in cart popup/page | ⏳ not started | — | — |
| 6 | Preserve bold formatting in Vendor Shipping & Returns | ⏳ not started | — | — |
| 7 | Free Shipping display verification (7 surfaces) | ⏳ not started | — | — |
| 8 | Packaging display safety re-confirmation | ⏳ not started | — | — |
| 9 | 320px homepage/search overflow investigation+fix | ⏳ not started | — | — |
| 10 | White/Grey legacy redirect investigation+fix | ⏳ not started | — | — |
| 11 | Full redirect audit | ⏳ not started | — | — |
| 12 | Final QA pass, evidence doc | ⏳ not started | — | — |

**Full test suite as of this handoff:** `npm test` → 146/146 files, 1499/1499
tests passing. `npx tsc --noEmit` clean. `npx eslint .` clean on all tracked
code (the only lint error is in `qa-sweep.js`, a gitignored/untracked local
scratch file, not part of this branch — ignore it, it predates and is
unrelated to this work).

### Real findings from Tasks 1-4 (things that mattered)

1. **Task 1** — the live `trocars-trocar-kits` filter registry entry was
   genuinely wrong before this work: it exposed `type`/`needle_gauge`/
   `needle_length`/`sterility`/`color` facets that don't exist on any Trocar
   product (copied from the `needles-syringes` template by mistake), and was
   missing `glove_size` entirely despite 27/41 products having it. Fixed to
   `cat(M.material, M.gloveSize, M.size, M.features, M.otherFeatures, M.use)`,
   matching Izzy's verified registry exactly.
2. **Task 3 — the plan's own premise was wrong, and the implementer caught
   it.** The plan (written from prior research) assumed the live primary nav
   is built by `buildCategoryNav()` in `lib/category-nav.ts`. It isn't —
   that function is dead code from the UI's perspective (only its own test
   calls it). The real nav is `buildCategoryTreeNav()` in
   `lib/category-tree.ts`, consumed by `components/layout/Header.tsx:163`.
   Once corrected, the investigation found: no alphabetical sort exists
   anywhere in the nav pipeline (so "exception to alphabetical order" was
   never actually needed), "Surgery & Procedure" already resolves directly
   to the live Trocar collection (319 tag-matched products per
   `audit/live/route-table.md`), and `CategoryPageView.tsx` already has
   breadcrumbs/SEO/canonical/CollectionPage+BreadcrumbList+ItemList schema
   for every category page generically. No code change was needed — verified
   as a real no-op, not skipped. **If you're auditing nav code later, don't
   trust `lib/category-nav.ts`'s `buildCategoryNav()` — it's dead.**
3. **Task 4** — manual browser verification (the plan's Step 5) could not be
   performed in this environment: `claude-in-chrome` reported "not
   connected." The reviewer judged the automated RTL tests (link role, href,
   focus, no-nested-button assertions against real `<a href>` elements, not
   mocks) sufficient evidence for this specific link-vs-div swap, but a
   human/tooled live-browser spot-check is still recommended before launch —
   **carry this into Task 12's evidence doc as an explicit checklist item.**
   Also: the plan assumed an existing `axe()` test pattern in
   `ProductView.a11y.test.tsx` that doesn't exist (no axe/jest-axe wired into
   the vitest suite at all — only Playwright e2e has `@axe-core/playwright`).
   Worked around correctly with role/focus assertions matching the file's
   real idiom; wiring real axe into vitest is flagged as a separate backlog
   item, not this plan's scope.

### Parked/deferred minors (carried in the ledger, not blocking)

- Task 3: nav entry is labeled "Surgery & Procedure," not "Trocar Supplies"
  — the display name is client-approved copy
  (`lib/category-tree.ts:52-56`), so relabeling needs a client decision, not
  a dev fix. The destination/position are correct regardless.
- Task 4: manual browser walkthrough outstanding (see above) — Task 12
  checklist item.
- Task 4: no axe/jest-axe in the vitest suite (see above) — separate backlog
  item, not this plan's scope.

## Ground rules to carry forward (unchanged from the plan's Global Constraints)

- **No Shopify writes** — no catalog, metafield, price, inventory, or
  product-status writes from this repo, ever, in any task.
- **Preserve manufacturer codes-in-parentheses and glove sizing in titles.**
- **Preserve natural numeric-then-alphabetical sort** in every filter/list
  touched — reuse `lib/catalog/facet-order.ts`'s `orderFacetValues`, don't
  replace it.
- **Never expose raw Shopify tags** — every filter goes through
  `lib/filter-registry.ts`'s allowlist.
- **Free Shipping stays a strict AND-gate** (merchant metafield AND
  resolver-confirmed $0) in every one of the 7 display surfaces Task 7 will
  check.
- **No runtime parsing of product descriptions** for packaging or
  shipping/returns — structured metafields only.
- **This is TDD work** — every task so far wrote the failing test first,
  watched it fail for the stated reason, then implemented minimally.
- **Do not push code changes without the user's explicit go-ahead** — this
  handoff commit/push is a one-time exception the user explicitly authorized
  in this session, specifically to enable resuming on a different machine.
  Once you're back to normal task execution (Task 5 onward), the no-push
  rule resumes as written in the plan — ask before pushing any further work.

## Everything committed in this handoff

One commit on `catalog-cro-review-sardor-dev` (pushed) bundles:
- The 3 pre-existing uncommitted docs from the 2026-08-17 session
  (`docs/launch/2026-08-17-*.md`) — untouched, just finally committed.
- The plan doc (`docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md`).
- This handoff doc.
- The force-added SDD workspace (`.superpowers/sdd/2026-08-18-bilal-final-prelaunch-scope/`)
  — ledger, task briefs 1-9 (pre-extracted ahead of dispatch, a couple
  further than were actually used), implementer reports 1-4, and review-package
  diffs 1-2 and 4 (Task 3 had no diff — verification only).

Tasks 1, 2, 4's actual code changes were already committed individually by
their implementer subagents before this handoff commit — those are
separate, already-existing commits on this branch, not part of the handoff
commit itself.

### Rebase note (read this if any SHA above looks unfamiliar)

When pushing this handoff, `git push` was rejected: another session had
pushed `7a6c276` ("P0.5 shipping copy cleanup, Vendor Shipping & Returns tab
rename, Backorder ETA, AeroWalk redirect") directly on top of this branch's
shared base, in parallel with this session's Tasks 1-4. That commit touches
`proxy.ts` and `ProductView.tsx` — the same two files Tasks 2 and 4 changed.
Rebased onto it (`git rebase origin/catalog-cro-review-sardor-dev`) rather
than merging, per this session's git-safety norms. **The rebase applied with
zero textual conflicts**, and — because a clean textual rebase doesn't
guarantee semantic correctness on overlapping files — the full suite,
`tsc --noEmit`, and a direct grep for both feature sets' key strings were
re-run and confirmed passing/present before pushing (145 files/1497 tests
green). All commit SHAs were rewritten by the rebase; the table above and
the ledger use the current, correct, already-pushed SHAs. If you're
reconciling against an old note or screenshot with `3ff3fa2`/`5333f19`/
`9d1e377`/`75a92d8` in it, those are the pre-rebase hashes — `git log` on
this branch is the source of truth now.
