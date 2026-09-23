# P0 SEO migration integrity — evidence package

Follow-up to the completed **T4 · Redirects & Broken Backlinks**. Baseline
commit this work branched from: `76feafe6bf5379a06bfdb9bf701774776595a71d`.

## Source datasets (both required by the ticket, both represented here)

- `mdsupplies.com-broken-backlinks-subdomains_2026-04-26_19-10-19(3).csv` — 36 rows / **26 unique targets** (confirmed by `scripts/seo-migration/parse-csvs.mjs`).
- `mdsupplies.com-backlinks-subdomains_2026-09-01_13-28-23.csv` — 51 rows / **25 unique targets, 22 of them images** (confirmed by the same script).
- Combined, deduplicated by exact target URL: **51 unique targets, zero overlap between the two files** (see `unified-targets.json`).

## Pipeline (reproducible, not a manually-copied subset)

```
node scripts/seo-migration/parse-csvs.mjs                 # -> unified-targets.json
npx tsx scripts/seo-migration/simulate-current.mts         # -> current-behavior.json (runs the exact targets through the real proxy())
NODE_OPTIONS='--conditions=react-server' npx tsx scripts/seo-migration/match-images.mts   # -> image-search-results.json (live QA Storefront search)
npx tsx scripts/seo-migration/build-inventory.mts           # -> unified-inventory.{json,md} + __tests__/fixtures/seo-migration-targets.json
```

`__tests__/fixtures/seo-migration-targets.json` is what the regression suite
(`__tests__/proxy.test.ts`, describe block "fixture-driven regression sweep")
actually asserts against — the exact CSV targets, run through the real
`proxy()`, not a cleaned-up hand list.

## Workstream A — unified inventory

`unified-inventory.md` / `.json`: every one of the 51 unique targets, typed,
with referring context, spam flag, current/expected response, final
destination, status, rationale, and a stable test-case ID.

## Workstream B — encoded-path hardening

**Root cause found:** the previous `proxy()` normalization swapped `+` for a
space but never percent-decoded at all. Any legacy URL using `%20` — and, per
the September export, sometimes `%20` and `+` mixed in the *same* URL (e.g.
`…-Graham%20Medical-Drape+Sheet+White…`) — silently fell through to a 404
instead of matching `REDIRECT_ENTRIES`.

Fix: `proxy.ts`'s `normalizeLegacyPathname()` now swaps `+`→space **first**
(so a genuinely-encoded `%2B` survives to be decoded as a real `+`, not
corrupted into a space), then percent-decodes via `safeDecodeURIComponent()`,
which never throws — malformed/truncated escapes (`%`, `%2`, `%zz`) decode
whatever is well-formed and leave the rest untouched. No lowercasing was
added (case-sensitive legacy segments are preserved, per the T4 baseline).

Before/after (live, local dev server):

```
# %20 alone — was a 404, now:
$ curl -sI 'http://localhost:3000/medical-supply-store/Pharmaceuticals/Medication%20Aids/Narcotics%20Storage-GRF8SCRI15.html'
HTTP/1.1 410 Gone

# mixed %20 + + in the same URL (real 2026-09-01 export row) — was a 404, now:
$ curl -sI 'http://localhost:3000/medical-supplies-Graham%20Medical-Drape+Sheet+White+40+x+60+2-Ply-XVUAKHW2KF.html'
HTTP/1.1 301 Moved Permanently
location: /category/exam-room

# malformed encoding — never throws / never 500s:
$ curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/some-random-page%'
404
```

Test coverage: `__tests__/proxy.test.ts`, describe block "encoded-path
hardening" — `+` alone, `%20` alone, mixed `%20`+`+`, `%2B` non-corruption,
query-string `+` untouched, three malformed-encoding shapes, trailing slash
on an encoded match, query-string variants converging on one canonical
pathname, and case-sensitivity (no accidental lowercasing merge).

## Workstream C — page/backlink recovery

All 26 unique page-type targets from the April export were already covered
by the T4 baseline and remain so. Of the 3 non-image page-type targets in the
September export, all 3 already had baseline coverage except one new row —
`Thorne Research MediClear-SGS Chocolate` — which got a 410 on the same basis
as the two existing Thorne VeganPro 410s (vendor confirmed absent from the
live catalog via Storefront search). No new 301 destinations were invented;
no chains introduced (verified by the "no fixture 301 target is itself a
`from` key" test).

## Workstream D — direct legacy image backlinks

22 unique image targets, classified against the **live QA Storefront API**
(not guessed):

- **9 → 410** (Dynarex tattoo needle codes, a service/requisition form, an
  injectable pharmaceutical, a discontinued disposal unit, a UI badge that's
  no longer a static image) — no confident current-catalog match.
- **1 → 301, recovered** (`3Y3PKD2E6Q.gif`, Alcohol Prep Pad) — redirects
  directly to the live Dukal CDN image asset, not an HTML page.
- **4 → intentional no-recovery** (spam/off-topic referring context, no
  product-identifying signal — see `EXCEPTIONS.md`).
- **8 → Needs Izzy SEO review** (plausible-but-unverified candidates — see
  `EXCEPTIONS.md`). Left unresolved rather than guessed at.

Sample image-recovery proof (live, local dev server):

```
$ curl -sI 'http://localhost:3000/sup/images/productImages/3Y3PKD2E6Q.gif'
HTTP/1.1 301 Moved Permanently
location: https://cdn.shopify.com/s/files/1/0821/0989/0793/files/857-4000.jpg?v=1786100370

$ curl -sI 'https://cdn.shopify.com/s/files/1/0821/0989/0793/files/857-4000.jpg?v=1786100370'
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 555508
```

Real, non-empty `image/jpeg` bytes — not an HTML product page, not a
placeholder.

## Workstream E — host/protocol variants

Both export files include a mix of `mdsupplies.com` / `www.mdsupplies.com`
and `http`/`https` targets (see the `targetUrl` field in `unified-targets.json`
— e.g. the two `root` "/" rows differ only by host/protocol). Host/protocol
normalization (canonical host + forced HTTPS) happens outside this app (DNS/
hosting layer), as documented in the T4 baseline; `proxy()` only ever sees
the already-normalized path, so no extra application-level hop was added.

## Workstream F — automated regression gate

`__tests__/proxy.test.ts` describe block "fixture-driven regression sweep"
iterates all 51 fixtures from `__tests__/fixtures/seo-migration-targets.json`
(exact CSV targets) and asserts status + destination for every one. It runs
under the existing `npm test` (vitest) CI job (`.github/workflows/ci.yml`,
`unit-tests`) — no new CI wiring needed. Full local run:

```
Test Files  1 passed (1)
     Tests  187 passed (187)
```

Full-repo suite (`npx vitest run`): 178 files, 2012 tests, all passing.
`npx tsc --noEmit` and `npx eslint . --max-warnings 0`: both clean.

## Exceptions

See `EXCEPTIONS.md` — 8 "Needs Izzy SEO review" image candidates, 4
intentional no-recovery spam/off-topic image targets. Zero page-level
exceptions.

## Live post-deploy verification checklist (for whoever deploys this)

Re-run against the production domain after deploy:

```
curl -sI https://mdsupplies.com/medical-supply-store/Pharmaceuticals/Medication%20Aids/Narcotics%20Storage-GRF8SCRI15.html   # expect 410
curl -sI https://mdsupplies.com/medical-supplies-Graham%20Medical-Drape+Sheet+White+40+x+60+2-Ply-XVUAKHW2KF.html            # expect 301 -> /category/exam-room
curl -sI https://mdsupplies.com/sup/images/productImages/3Y3PKD2E6Q.gif                                                      # expect 301 -> cdn.shopify.com/.../857-4000.jpg
curl -sI https://mdsupplies.com/sup/images/productImages/K8J9ZVU2GY.gif                                                      # expect 410
```
