# Dependency risk exceptions

Advisories that `npm audit --audit-level=high` reports and that we have
consciously accepted **for now**, with the reason and the exit condition.

The audit is never deleted, silenced, or `--force`-fixed into a broken tree.
`scripts/audit-with-exceptions.mjs` enforces this list: an advisory named here
is reported but does not fail CI; **anything not named here fails**. So a new
vulnerability cannot hide behind an old exception.

Reviewed: 2026-08-03.

## Currently accepted

### GHSA-f88m-g3jw-g9cj — `sharp` (high)

- **Path:** `next@16.2.12 → sharp@0.34.5`. Not a direct dependency.
- **Advisory:** sharp inherits libvips CVE-2026-33327, -33328, -35590, -35591.
- **Fix:** `sharp >= 0.35.0`, reachable only by upgrading `next` to **16.3.0**.
- **Exposure:** sharp is used by Next's image optimiser. This storefront serves
  product imagery from Shopify's CDN and BunnyCDN; the surface is
  build/server-side image processing of **first-party, non-user-supplied**
  images. There is no path for an untrusted user to submit an image to sharp —
  the only upload path (RX prescription documents) is stored, not processed.
- **Exit:** the `next` 16.3.0 upgrade below.

### GHSA-qx2v-qp2m-jg93, -6g55-p6wh-862q, -r28c-9q8g-f849, -fxqj-rqcc-2cmp — `postcss` (high)

- **Path:** `next@16.2.12 → postcss`. Build-time only.
- **Exposure:** postcss runs at build against first-party CSS. The advisories
  concern attacker-controlled CSS/source maps, which never reach this build.
- **Exit:** the `next` 16.3.0 upgrade below.

### `next` (high, direct)

- **Fix:** 16.3.0 — semver-**minor**, not major.
- **Exit:** see below.

## The exit condition for all three: upgrade `next` to 16.3.0

`npm audit fix` refuses this on its own ("outside the stated dependency range")
and `npm audit fix --force` would take it. It is deliberately **not** bundled
into the catalog/CRO remediation branch:

- It is a framework minor bump on a production storefront, and this repo's
  `AGENTS.md` warns that this Next version's APIs and conventions differ from
  what the tooling assumes. It needs its own build + E2E + visual pass.
- Bundling it would confound review: a reviewer could not separate "did the
  remediation break this?" from "did the framework upgrade break this?".

**Recommendation:** land it as its own PR, verified against the full gate set.
It clears all three remaining high advisories at once.

## Already fixed (kept for the audit trail)

`npm audit fix` (non-forced, 2026-08-03) cleared, with no code changes and all
gates green afterwards:

| Package | Severity | Advisories |
|---|---|---|
| `undici` | high | GHSA-8xcm-r25x-g524, -4cwx-7wf7-3272, -m8rv-5g2x-5cg5, -jr45-8vmc-qm54, -v3r7-h72x-cjcm |
| `brace-expansion` | high | GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 |
| `@next/third-parties` | moderate | (transitive) |

Before: 4 high + 1 moderate. After: 3 high, all blocked on the same `next`
upgrade.

## Rules

1. Adding an entry requires the path, the exposure argument, and an exit
   condition. "No fix available" alone is not an exception — check
   `fixAvailable` in `npm audit --json` first. The sharp entry above was
   originally mis-reported as unfixable because the human-readable output says
   "No fix available" for the package while the JSON names `next@16.3.0`.
2. Re-review at every dependency bump and at minimum every 90 days.
3. Never use `--force` to silence an advisory without verifying the full gate
   set afterwards.
