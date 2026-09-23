// MD Supplies — Shopify Customer Events custom pixel.
// Paste into Shopify Admin → Settings → Customer events → Add custom pixel.
// Replace G-XXXXXXXX with the real GA4 Measurement ID before saving.
//
// This is the SINGLE authoritative source of the GA4 `purchase` event. The
// headless storefront never emits one: it cannot — the order is created inside
// Shopify checkout, on a different origin, after the storefront is gone. Any
// second purchase source (the Google & YouTube channel app, a GTM tag on the
// order-status page, a server-side webhook) would double-count revenue. Before
// enabling any of those, retire this pixel. See docs/analytics/README.md.
//
// No PII is sent: only the order id, money, and line items.

var GA4_MEASUREMENT_ID = 'G-XXXXXXXX'; // <-- replace on paste

// Load gtag.js once inside the pixel sandbox.
var s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
document.head.appendChild(s);
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());

// Idempotency. Shopify is documented to deliver checkout_completed once, but
// the sandbox is re-created on an order-status page reload and delivery is
// at-least-once, not exactly-once. Two guards, because either can be absent:
//  - an in-memory set, which catches a repeat inside one sandbox instance;
//  - localStorage, which catches a reload/revisit of the same order.
// A purchase is the one event where a duplicate directly corrupts revenue, so
// it gets belt and braces where nothing else on the site does.
var SEEN_KEY = 'md_ga4_purchase_sent';
var seenInMemory = {};

function alreadySent(orderId) {
  if (seenInMemory[orderId]) return true;
  try {
    var raw = window.localStorage.getItem(SEEN_KEY);
    var list = raw ? JSON.parse(raw) : [];
    if (list.indexOf(orderId) !== -1) return true;
  } catch (_e) {
    // Storage unavailable (private mode, blocked cookies). The in-memory guard
    // still applies; a duplicate is preferable to dropping the purchase.
  }
  return false;
}

function markSent(orderId) {
  seenInMemory[orderId] = true;
  try {
    var raw = window.localStorage.getItem(SEEN_KEY);
    var list = raw ? JSON.parse(raw) : [];
    list.push(orderId);
    // Bounded: only recent orders matter, and this must not grow forever.
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-20)));
  } catch (_e) { /* see alreadySent */ }
}

/** Reads one cart/checkout attribute by key. */
function attr(attributes, key) {
  for (var i = 0; i < (attributes || []).length; i++) {
    if (attributes[i].key === key) return attributes[i].value;
  }
  return undefined;
}

/** Parses the `cid=…&sid=…&sct=…` blob the storefront writes at handoff. */
function parseGaSession(value) {
  var out = {};
  if (!value) return out;
  var pairs = String(value).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var eq = pairs[i].indexOf('=');
    if (eq > 0) out[pairs[i].slice(0, eq)] = pairs[i].slice(eq + 1);
  }
  return out;
}

analytics.subscribe('checkout_completed', function (event) {
  var checkout = event.data && event.data.checkout;
  if (!checkout) return;

  // The order id is the dedup key. Without it a `purchase` would collapse all
  // orders into one transaction in GA4, so skip rather than send a bad event.
  var order = checkout.order;
  if (!order || order.id == null) return;
  var transactionId = String(order.id);
  if (alreadySent(transactionId)) return;

  var attrs = checkout.attributes || [];
  var clientId = attr(attrs, 'ga_client_id');
  var session = parseGaSession(attr(attrs, 'ga_session'));

  // Why session_id matters as much as client_id (lib/analytics/
  // checkout-handoff.ts has the full note): client_id alone attaches the
  // purchase to the right user but starts a NEW GA4 session for it. A new
  // session carries no campaign parameters, so it resolves to (direct) and the
  // revenue detaches from the utm_source=jant session that produced it.
  // Replaying session_id puts the purchase back inside the originating session
  // and it inherits that session's source/medium/campaign.
  var config = { send_page_view: false };
  if (clientId) config.client_id = clientId;
  if (session.sid) config.session_id = session.sid;
  if (session.sct) config.session_number = session.sct;
  gtag('config', GA4_MEASUREMENT_ID, config);

  // Shopify may send monetary amounts as strings; GA4 expects numbers.
  function num(v) { return v == null ? undefined : Number(v); }

  var items = (checkout.lineItems || []).map(function (li, i) {
    var variant = li.variant || {};
    var item = {
      // Matches item_id on every pre-purchase event the storefront sends
      // (lib/analytics/events.ts cartLineToGA4Item), so the funnel joins.
      item_id: variant.id || li.id,
      item_name: li.title,
      price: variant.price ? num(variant.price.amount) : undefined,
      quantity: li.quantity,
      index: i,
    };
    if (variant.sku) item.item_sku = variant.sku;
    if (variant.title && variant.title !== 'Default Title') item.item_variant = variant.title;
    if (variant.product && variant.product.vendor) item.item_brand = variant.product.vendor;
    // Per-line discount, so a campaign's promo can be measured against it.
    if (li.discountAllocations && li.discountAllocations.length) {
      var discount = 0;
      for (var d = 0; d < li.discountAllocations.length; d++) {
        var amt = li.discountAllocations[d].amount;
        if (amt) discount += Number(amt.amount) || 0;
      }
      if (discount > 0) item.discount = discount;
    }
    return item;
  });

  var payload = {
    transaction_id: transactionId,
    value: checkout.totalPrice ? num(checkout.totalPrice.amount) : undefined,
    currency: checkout.currencyCode,
    tax: checkout.totalTax ? num(checkout.totalTax.amount) : undefined,
    shipping: checkout.shippingLine && checkout.shippingLine.price
      ? num(checkout.shippingLine.price.amount) : undefined,
    items: items,
  };

  // Coupon: GA4's `coupon` is a single string, Shopify allows several codes.
  var codes = checkout.discountApplications || [];
  var applied = [];
  for (var c = 0; c < codes.length; c++) {
    if (codes[c].title) applied.push(codes[c].title);
    else if (codes[c].code) applied.push(codes[c].code);
  }
  if (applied.length) payload.coupon = applied.join(',');

  markSent(transactionId);
  gtag('event', 'purchase', payload);
});
