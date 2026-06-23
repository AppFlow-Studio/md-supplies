// MD Supplies — Shopify Customer Events custom pixel.
// Paste into Shopify Admin → Settings → Customer events → Add custom pixel.
// Replace G-XXXXXXXX with the real GA4 Measurement ID before saving.
// Emits exactly one GA4 `purchase` per checkout_completed. No PII is sent.

const GA4_MEASUREMENT_ID = 'G-XXXXXXXX'; // <-- replace on paste

// Load gtag.js once inside the pixel sandbox.
const s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
document.head.appendChild(s);
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data && event.data.checkout;
  if (!checkout) return;

  const attrs = checkout.attributes || [];
  const clientIdAttr = attrs.find((a) => a.key === 'ga_client_id');
  const clientId = clientIdAttr ? clientIdAttr.value : undefined;

  gtag('config', GA4_MEASUREMENT_ID, Object.assign(
    { send_page_view: false },
    clientId ? { client_id: clientId } : {},
  ));

  // The order id is the dedup key. Without it a `purchase` would collapse all
  // orders into one transaction in GA4, so skip rather than send a bad event.
  const order = checkout.order;
  if (!order || order.id == null) return;

  // Shopify may send monetary amounts as strings; GA4 expects numbers.
  const num = (v) => (v == null ? undefined : Number(v));

  const items = (checkout.lineItems || []).map((li, i) => ({
    item_id: (li.variant && li.variant.id) || li.id,
    item_name: li.title,
    price: li.variant && li.variant.price ? num(li.variant.price.amount) : undefined,
    quantity: li.quantity,
    index: i,
  }));

  // No PII: only order id, money, and line items are sent.
  gtag('event', 'purchase', {
    transaction_id: String(order.id),
    value: checkout.totalPrice ? num(checkout.totalPrice.amount) : undefined,
    currency: checkout.currencyCode,
    tax: checkout.totalTax ? num(checkout.totalTax.amount) : undefined,
    shipping: checkout.shippingLine && checkout.shippingLine.price
      ? num(checkout.shippingLine.price.amount) : undefined,
    items: items,
  });
});
