# Security hardening — secret containment + RX document storage (2026-07-19)

Ticket: *MDSUPPLIES · Security hardening — contain secrets + lock down prescription-document storage* (P0).

## 1. Secret scan — method and findings

Scanned the working tree and **all 592 commits** across every ref for: provider key
prefixes (`re_`, `shpat_`, `shpss_`, `shpca_`), BunnyCDN GUID-format AccessKeys,
value assignments to every sensitive env var named in `.env.example`, committed
`.env` variants, and tunnel/private URLs.

| Finding | Location | Status |
|---|---|---|
| **LIVE BunnyCDN storage AccessKey** (matches current production key) | `docs/superpowers/plans/2026-06-19-bunnycdn-image-pipeline.md:254`, introduced by commit `31d0bea` ("some small fixes") | Redacted in tree. **Remains in git history — key MUST be rotated** (see §2). |
| Provider-prefix keys (Resend/Shopify) | none in tree or history | ✅ clean |
| Committed `.env` files | never committed on any ref | ✅ clean |
| Sensitive env vars assigned real values | only the Bunny finding above | ✅ clean after redaction |
| `NEXT_PUBLIC_*` exposure | only `SITE_URL`, `IS_STAGING`, `GTM_ID`, `VERCEL_ENV` — all non-secret by design | ✅ clean |
| Customer data / private URLs in repo | none found | ✅ clean |

CI regression guard (`.github/workflows/ci.yml`, forbidden-content scan) now also
blocks: BunnyCDN GUID-format keys anywhere, real-looking values assigned to the
six sensitive env vars, and any tracked `.env` file.

## 2. Rotation checklist — OWNER ACTIONS (blocking)

The leaked key grants **read/write/delete on the entire `md-supplies` storage
zone** — the same zone that holds RX prescription documents. Treat as exposed.

1. **BunnyCDN** (bunny.net dashboard → Storage → `md-supplies` zone → *FTP & API Access*):
   regenerate the zone password/AccessKey. The old value `54cf94cd-…` must stop
   working (test with a `curl -H "AccessKey: <old>"` request → expect 401).
2. Update the new key in: local `.env`, Vercel project env (`BUNNYCDN_STORAGE_ACCESS_KEY`),
   GitHub Actions secrets if/when added. Never in a tracked file.
3. **Optional but recommended while in the dashboards** (least privilege):
   - Bunny: confirm the storage zone has **no public Pull Zone** attached (the
     privacy model depends on this — see §4) and no unused FTP accounts.
   - Shopify Admin token: confirm scope is exactly `read_customers, write_customers`.
   - Resend key: confirm it is a sending-only key.
4. Git history purge was **not** performed (592 commits, many merge branches, all
   teammates would need to re-clone; the repo is private and rotation kills the
   credential's value). **Residual exposure**: the *rotated-dead* key string
   remains readable in history at `31d0bea`. If the org later requires a clean
   history, use `git filter-repo --replace-text` on a coordinated freeze day.
5. Vercel/CI logs: no secret was ever printed by app code (verified — the only
   `console.*` calls in the credential paths log errors, not keys). Bunny key
   usage occurs in outbound headers only.

## 3. Storage decision (the "blocked on Munis" item)

**Decision implemented and hereby proposed for confirmation:** RX documents live
on the **existing private BunnyCDN storage zone** (no public Pull Zone), under
the reserved `rx-documents/` prefix, reachable *only* through the storage API
with the server-held AccessKey. No new storage service is introduced.

```
                       ┌────────────────────────────────────────────┐
                       │  BunnyCDN storage zone "md-supplies"       │
                       │  (private: AccessKey-only, no Pull Zone)   │
                       │                                            │
   public images ──────┼──▶ categories/…, products/…                │
                       │                                            │
   RX documents  ──────┼──▶ rx-documents/<customerId>/<uuid>.<ext>  │
                       └────────────────────────────────────────────┘
                ▲                                   ▲
                │ AccessKey (server env only)       │ AccessKey (server env only)
                │                                   │
   ┌────────────┴────────────┐        ┌─────────────┴──────────────────┐
   │ /api/bunny/[...path]    │        │ /api/account/rx-document (GET) │
   │ public image proxy      │        │ auth: Shopify customer session │
   │ • 404s rx-documents/*   │        │ • path ONLY from the signed-in │
   │ • rejects traversal     │        │   customer's own metafield     │
   │ • nosniff               │        │ • isOwnRxDocumentPath re-check │
   └─────────────────────────┘        │ • no-store, nosniff, derived   │
                                      │   Content-Type                 │
                                      └────────────────────────────────┘
   Upload: server action uploadRxDocument (auth required)
   • size ≤ 10 MB • magic-byte sniffing (PDF/JPEG/PNG/WebP only)
   • path = rx-documents/<ownerId>/<uuid> (unguessable)
   • metafield write via least-privilege Admin token
   • replacement resets rx_verified=false and deletes the old blob
```

Controls mapped to the ticket's requirements:

| Requirement | Implementation |
|---|---|
| Private storage, off the public image path | Reserved prefix + hard 404 in the public proxy; zone has no Pull Zone; API requires AccessKey |
| Short-lived signed access | Equivalent-or-stronger: documents are **never URL-addressable at all** — each read is authenticated per-request by the customer session; nothing to leak or replay |
| Type/size checks | 10 MB cap; MIME allowlist **plus magic-byte sniffing** (declared type is ignored for storage) |
| Malware scanning | **Option B chosen by Munis 2026-07-19 — implemented** (`lib/rx-scan.ts`): every upload is scanned via a **self-hosted ClamAV REST service** (VirusTotal-style multiscanners are prohibited — they share submissions, and these files are PII). Infected files always rejected + audited. `RX_SCAN_REQUIRED=true` makes scanner downtime fail closed. **Owner: stand up the ClamAV container and set `RX_SCAN_CLAMAV_URL` (+`RX_SCAN_REQUIRED=true`) before launch** — until then uploads proceed unscanned with an audit log |
| Encryption in transit | HTTPS on every hop (browser→Vercel, Vercel→Bunny API) |
| Encryption at rest | Bunny storage-zone provider-side encryption — **owner to confirm zone setting/region in dashboard** |
| Audit logging | `[rx-audit]` structured server logs (Vercel log drain): `document_uploaded` (with `replaced=` flag), `document_served`, `stale_document_delete_failed` — customer id only, never file contents/names |
| Analytics hygiene | Verified: **zero** `track()`/analytics calls in the RX flow; no document path, name, contents, or verification metadata reaches GTM/GA |
| Retention/deletion | Exactly one live document per customer: replacement deletes the superseded blob (best-effort + audited on failure). Full deletion on account erasure = delete `rx-documents/<id>/` + clear metafields (manual/ops runbook step for GDPR-style requests) |

## 4. Threat-test results (automated, in the suite)

| Threat | Test | Result |
|---|---|---|
| IDOR / cross-account read | `rx-storage.test.ts` (`isOwnRxDocumentPath` exact-folder matching, forged-gid rejection); retrieval route accepts **no path input** — path comes from the customer's own metafield | ✅ blocked |
| Predictable paths | UUID filename assertion in `buildRxDocumentPath` test | ✅ unguessable |
| Path traversal | bunny proxy 400s `..`/`.`/empty segments (route test) | ✅ blocked |
| RX prefix via public proxy | new route test: `rx-documents/*` → 404, upstream never called | ✅ blocked |
| Forged MIME / stored script (HTML, SVG) | new `sniffRxContentType` tests: HTML+SVG rejected regardless of declared type; response Content-Type derived from allowlisted extension + `nosniff` | ✅ blocked |
| Oversized file | 10 MB cap in `uploadRxDocument` (server-side, before any storage write) | ✅ blocked |
| Replay | no signed URLs exist to replay; session cookie is the only credential and reads are per-request authenticated | ✅ n/a by design |
| Replaced document keeps verified status | **was a real gap — fixed**: replacement now force-writes `rx_verified=false` (`admin-rx.test.ts`) and deletes the old blob | ✅ fixed + tested |
| Staff overreach | app surface: none (no admin UI reads other customers' docs). Bunny dashboard + Shopify admin access = org-level control — **owner to restrict dashboard seats** | ⚠️ org process |
| Deleted documents lingering | replacement deletes the old blob; failures audited (`stale_document_delete_failed`) for manual cleanup | ✅ + audited |

## 5. Sign-off checklist (acceptance criteria)

- [x] Old Bunny AccessKey rotated and verified dead (§2.1) — rotated by Munis
      2026-07-19; verified same day: old key → HTTP 401, new key → HTTP 200
      against `ny.storage.bunnycdn.com/md-supplies/`. Vercel env updated +
      redeployed. (Note: mdsupplies.com still points at the legacy Shopify
      storefront pre-cutover, so post-rotation image serving was verified
      against the storage API + local env, not the public domain.)
- [x] New secrets not tracked in repo, not in client bundle (CI-enforced)
- [x] Cross-account document read blocked — verified by test, not assumption
- [x] RX storage confirmed off the public BunnyCDN image path (proxy denial + no Pull Zone)
- [x] Storage decision (private Bunny zone + authenticated proxy, §3) confirmed by Munis 2026-07-19
- [ ] Security/privacy owner sign-off on upload/access/retention/incident procedure — **owner**
- [x] Malware-scanning decision recorded: **Option B (scan)**, chosen by Munis 2026-07-19; code integration complete, ClamAV service deployment pending (owner)
- [x] Bunny dashboard checks done by Munis 2026-07-19: no Pull Zone attached to the storage zone; region/encryption noted
