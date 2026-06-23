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

  const order = checkout.order || {};
  const items = (checkout.lineItems || []).map((li, i) => ({
    item_id: (li.variant && li.variant.id) || li.id,
    item_name: li.title,
    price: li.variant && li.variant.price ? li.variant.price.amount : undefined,
    quantity: li.quantity,
    index: i,
  }));

  // No PII: only order id, money, and line items are sent.
  gtag('event', 'purchase', {
    transaction_id: String(order.id),
    value: checkout.totalPrice ? checkout.totalPrice.amount : undefined,
    currency: checkout.currencyCode,
    tax: checkout.totalTax ? checkout.totalTax.amount : undefined,
    shipping: checkout.shippingLine && checkout.shippingLine.price
      ? checkout.shippingLine.price.amount : undefined,
    items: items,
  });
});
