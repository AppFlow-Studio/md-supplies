# Inventory & location audit (read-only)

Shop: `daebb2-76.myshopify.com` · taken 2026-08-03T21:32:34.274Z
Active products scanned: **7385** · variants: **10293**

Read-only Admin API. No writes, no consolidation import, no location or
delivery-profile changes. This replaces the supplied inventory CSV, which
contained a header row and **zero data rows**.

## Locations

| Name | Active | Fulfils online orders | Ships inventory |
|---|:--:|:--:|:--:|
| Dukal | yes | yes | no |
| Dynarex | yes | yes | no |
| Graham Field | yes | yes | yes |
| MDSupplies | yes | yes | no |
| MDSupplies $20 Shipping | yes | yes | no |
| MDSupplies (Minimum Order $700) | yes | yes | no |
| MDSupplies Free Shipping | yes | yes | no |
| MDSupplies Shipping $10.95 | yes | yes | no |
| Medchain Supply | yes | yes | no |
| MedPlus | yes | yes | no |

Active locations that fulfil online orders: **10** of 10.

## Publications

- Online Store
- Shop
- Point of Sale
- Google & YouTube
- Inbox
- Md Supplies Headless

## Delivery profiles

| Profile | Default | Variants | Locations |
|---|:--:|---:|---|
| General profile | yes | 279 | MDSupplies $20 Shipping |
| Graham Field | no | 500 | Graham Field |
| Dukal | no | 500 | Dukal |
| MedPlus $15 Shipping + $15 Vendor Processing Fee | no | 500 | MedPlus |
| Dynarex | no | 500 | Dynarex |
| Medchain | no | 500 | Medchain Supply |
| MDSupplies Shipping $10.95 | no | 427 | MDSupplies Shipping $10.95 |
| MDSupplies | no | 500 | MDSupplies, MDSupplies Free Shipping, MDSupplies $20 Shipping |
| $20.95 Shipping (Minimum Order Requirement $700) | $45.95 Shipping for orders under $700 | no | 500 | MDSupplies (Minimum Order $700) |
| Free Shipping | no | 500 | MDSupplies Free Shipping |

## Inventory tracking coverage

Variants with tracking ENABLED: **1** of 10293.

Inventory tracking is effectively **OFF store-wide**. This is the single most important fact in this audit and it reframes everything below: with tracking off, Shopify does not enforce `inventoryPolicy`, so the `DENY` on these variants stops nothing today. The negative balances are latent rather than currently harmful — but the moment tracking is switched on, every variant sitting below zero becomes immediately unbuyable.

## Discrepancies

| Finding | Variants | Why it matters |
|---|---:|---|
| **Negative available/on-hand** | 624 | Below zero is not a real stock level — oversold, or import residue |
| Stock only at non-online locations | 0 | Has stock but cannot be sold online |
| Tracked with no inventory level | 0 | Tracking on, nowhere to draw from |
| Zero everywhere + policy DENY | 0 | Unbuyable until restocked |
| Stock at an INACTIVE location | 0 | Stranded inventory |
| on_hand != available + committed | 0 | Ledger inconsistency |
| Untracked but reports a quantity | 623 | Misleading quantity |

## Correction package (proposed — NOT applied)

0. **Decide the tracking question first.** Every item below is downstream of
   it. Turning tracking on across a catalogue carrying negative balances
   would make those variants unbuyable the same minute, so the negatives must
   be reconciled BEFORE tracking is enabled, not after. Sequence matters more
   than any individual fix here.
1. **Negative balances** — reconcile to a real counted quantity. Do NOT clamp
   to zero with a bulk write: that discards the evidence of how far each item
   drifted, which is the only signal for whether this was overselling or a bad
   import. The distribution (mostly −1 to −4, tail beyond −17) is consistent
   with import residue rather than genuine oversell, which is why this audit
   does not approve another consolidation import.
2. **Stock only at non-online locations** — decide per location whether it
   should fulfil online orders, or move/relist the stock. Do NOT bulk-toggle
   `fulfillsOnlineOrders`: it changes what the storefront can sell and
   interacts with delivery profiles.
3. **Tracked with no level** — either create a level at the intended
   location or turn tracking off. Both are per-item decisions.
4. **Inactive location holding stock** — transfer before deactivating.
5. **Ledger mismatches** — reconcile in Shopify Admin; do not script.

Each is a separate, reversible operation and none is performed here.

Row-level detail: `evidence/inventory-discrepancies.csv` (gitignored).
