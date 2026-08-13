# Product labels on the headless storefront (Fordeer replacement)

**Status:** code is in place and inert. It activates the moment you create two
definitions in Shopify Admin (15 minutes, steps below). No Fordeer involvement,
no vendor dependency, no code change needed afterwards.

---

## Why Fordeer cannot feed the custom site

A read-only probe of this store's Admin API on 2026-08-02 looked for anything
Fordeer might expose:

| Looked for | Found |
|---|---|
| `fordeer` metafield namespace on products | **none** |
| App-reserved (`$app:…`) metafield definitions | **none** |
| Fordeer metaobject definitions | **none** |
| Label-ish product metafields | only `custom.custom_badge_1/2/3` (boolean) and `custom.custom_dynamic_badge` — pre-existing, not Fordeer's |

Fordeer stores its label rules **in its own database** and renders them through
a **theme app embed** — a snippet injected into the Liquid theme at page render.
That is why the app dashboard reads *"App embed: On"* and *"0 active app
blocks"*: the embed is enabled on the Online Store theme, which your custom
Next.js storefront never loads.

So there is nothing for the custom site to read. The options were:

1. Ask Fordeer for a supported API/app-proxy/metafield export
   (request template in `audit/izzy-production-handoff-2026-07-30.md` → IZ-03).
   Even if they say yes, it's their roadmap, not ours.
2. **Author labels in Shopify itself.** The data is then yours, readable over
   the Storefront API, versioned with the product, and free.

We built (2). It is strictly better for a headless store, and it means the
Fordeer subscription is only needed if you still want labels on the Online
Store theme.

---

## What you need to do in Shopify Admin (manual — I cannot write to production)

### Step 1 — Create the `product_label` metaobject definition

**Settings → Custom data → Metaobjects → Add definition**

- **Name:** `Product Label`
- **Type (auto-fills):** `product_label`

Add these fields exactly:

| Field name | Key | Type | Required |
|---|---|---|---|
| Internal name | `internal_name` | Single line text | ✅ |
| Text | `text` | Single line text | ✅ |
| Accessible text | `accessible_text` | Single line text | — |
| Style | `style` | Single line text | — |
| Priority | `priority` | Integer | — |
| Starts at | `starts_at` | Date and time | — |
| Ends at | `ends_at` | Date and time | — |
| Destination URL | `destination_url` | URL | — |
| Active | `is_active` | True or false | — |

`internal_name` is what you type in the assignment CSV; `text` is what the
customer sees. Keeping them separate lets you rename customer copy without
breaking your CSVs.

Then, still on the definition: **Storefronts → enable "Storefront API"** access.
Without this the storefront reads `null`.

`style` accepts: `rx`, `backorder`, `promo`, `neutral`.
`priority` is a sort order — lower shows first.

### Step 2 — Create the product metafield that points at labels

**Settings → Custom data → Products → Add definition**

- **Name:** `Product Labels`
- **Namespace and key:** `custom.product_labels`
- **Type:** **Metaobject → Product Label**, and tick **List of entries**
- **Storefront access: enabled** (same as above)

### Step 3 — Create your labels once

**Content → Metaobjects → Product Label → Add entry.** For example:

| text | style | priority | notes |
|---|---|---|---|
| `Rx Only` | `rx` | `10` | display only — see the note below |
| `BackOrder ETA` | `backorder` | `20` | prefer the dated metafield instead |
| `Free Shipping!` | `promo` | `30` | decorative only — see the warning below |

### Step 4 — Assign labels to products

On any product → **Metafields → Product Labels → Add entries**. Assign in bulk
from the products list, or via a CSV import if you want to do hundreds at once.

That's it. The storefront picks them up on the next revalidation (5 minutes).

---

## What the code already does with this

`lib/labels/shopify-labels.ts` normalizes those metaobjects into the same
`ProductLabel` contract that cards, the PDP, quick add and the cart already
render, so nothing downstream changes. It also:

- **honours the schedule** — a label outside `starts_at`/`ends_at` does not
  render, and an expired one disappears rather than lingering;
- **sorts by `priority`**;
- **falls back to `text`** when `accessible_text` is blank;
- **returns `[]` when the definitions don't exist yet**, which is why shipping
  it now is safe.

### Two rules the code enforces regardless of what you author

1. **A label can never create a shipping promise.** A `promo` label reading
   "Free Shipping!" is decorative. Actual free-shipping messaging comes only
   from the shipping resolver's `public_display_class`. If the resolver is
   unknown or conflicting, the customer sees *"Shipping calculated at
   checkout."* This is the precedence rule from the execution plan §8.3 and it
   is deliberately not overridable from Admin.
2. **An `Rx Only` label is display only.** It never gates checkout, and it can
   neither create nor clear RX status. The real gate is the account/document
   flow in `lib/rx-gate.ts` (tag ∪ `custom.is_rx_only`), which is **ON by
   default**; `RX_CHECKOUT_ENFORCEMENT=false` exists only as an emergency kill
   switch. A regression test proves a label reading "Rx Only" on a non-RX
   product does not gate that cart.

### Backorder: prefer the field you already have

You already maintain `custom.estimated_back_order_restock_date`, and the
storefront reads it as the single backorder source for both cards and PDP,
suppressing stale dates automatically. Prefer that over a hand-managed
`backorder` label — one dated field beats two places to update.

---

## Optional: switch the label rendering on

No flag is needed — `resolveShopifyLabels()` is additive and returns nothing
until Step 1–4 are done. Once you've created a couple of test labels, tell me
and I'll wire the Storefront query field in (it is a two-line query addition
per card/PDP query) and add the render path with tests. I left the query out
deliberately: requesting a metafield whose definition does not exist yet is
harmless but noisy, and I'd rather add it against a real definition than guess
the shape.

---

## If you still want Fordeer specifically

Send them the request in `audit/izzy-production-handoff-2026-07-30.md` (IZ-03).
If they confirm a supported API, app proxy, metafield output or webhook, the
provider stub at `lib/labels/fordeer-provider.ts` is where it plugs in — it
already fails safe and refuses to invent labels.

---

## Tooling (all read-only / dry-run — no Shopify writes)

### 1. Detect whether the definitions exist

```bash
node scripts/labels-detect-definitions.mjs
```

Read-only. Reports whether the `product_label` metaobject and the
`custom.product_labels` metafield exist, which required fields are present, and
whether any Fordeer-owned data is reachable. Exit 0 = ready, 1 = not ready.

Run against this store on 2026-08-02: **both MISSING**, and **no Fordeer-owned
Shopify data of any kind** — confirming the storefront correctly renders nothing
and that Fordeer keeps its rules outside Shopify.

### 2. Plan assignments from your CSV (dry run)

```bash
node scripts/labels-assign-dryrun.mjs your-list.csv
```

**Input CSV** (header required, column order free):

| column | required | use |
|---|---|---|
| `product_id` | preferred | Shopify product GID or numeric id — the identity |
| `handle` | fallback | resolved read-only; must match exactly one product |
| `sku` | optional | **reference only, never used to match** |
| `label` | yes | the `internal_name` of an existing `product_label` |

`sku` is deliberately non-identifying: the catalog has **3,166 SKU values that
span more than one product**, so matching on SKU would assign labels to the
wrong items.

**Outputs** (written, never applied):

- `labels-proposed-writes.json` — per product: current value, proposed value,
  and whether it is a no-op
- `labels-rollback.json` — each product's **current** value, captured before
  anything is planned, so a future write can be reverted exactly
- `labels-rejected.csv` — rows that could not be safely resolved (unknown
  label, unresolvable handle, no identity), with the reason. Rejected rows are
  never guessed.

### 3. Applying the plan

Not implemented, deliberately. Applying requires a Shopify write and therefore
your separate explicit approval. When approved, the apply step consumes
`labels-proposed-writes.json` and `labels-rollback.json` is the revert.

## Storefront query fragment (add when the definitions exist)

Against the official Storefront schema. Add to each product/card selection:

```graphql
productLabels: metafield(namespace: "custom", key: "product_labels") {
  references(first: 10) {
    nodes {
      ... on Metaobject {
        handle
        fields { key value }
      }
    }
  }
}
```

`lib/labels/shopify-labels.ts` already consumes exactly this shape via
`resolveShopifyLabels()`. It is not wired into the live queries yet: requesting
a metafield whose definition does not exist is harmless but noisy, and the
shape should be confirmed against real definitions rather than assumed.

## Hard limits enforced in code

These labels are **presentation only**. They may never be a source for:

| Concern | Real source |
|---|---|
| Free shipping | shipping resolver `public_display_class` |
| RX gating | `lib/rx-gate.ts` (tag ∪ `custom.is_rx_only`) |
| Availability / out of stock | Shopify `availableForSale` |
| Backorder state | `custom.estimated_back_order_restock_date` |
| Price | Shopify variant price |
| Fulfillment policy | Shopify delivery profiles |

A regression test asserts a label reading "Rx Only" on a non-RX product does
**not** gate that cart, and that no label can clear RX status on a real one.
