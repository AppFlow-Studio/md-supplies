import { Accordion } from "@/components/ui/Accordion";

const FAQ_ITEMS = [
  {
    q: "How long does shipping take?",
    a: "Orders are processed through trusted medical supply partners, with shipping details and options provided at checkout.",
  },
  {
    q: "Do you offer free shipping?",
    a: "Yes! Free standard shipping on all orders over $150. Orders under $150 have a flat-rate fee based on location and weight.",
  },
  {
    q: "Do you accept insurance?",
    a: "We do not bill insurance directly. However, we provide itemized invoices and order documentation that many customers use for insurance reimbursement claims.",
  },
  {
    q: "Do I need a prescription to order?",
    a: "Most products do not require a prescription as they are sold wholesale to licensed healthcare facilities. Certain regulated items may require valid professional credentials, which you will be prompted to provide at checkout.",
  },
  {
    q: "What's your return policy?",
    a: "We accept returns on unopened, undamaged products within 30 days of delivery. Items must be in original packaging. Contact support to initiate a return and receive a prepaid shipping label.",
  },
  {
    q: "Are your products authentic?",
    a: "Absolutely. Every product is sourced directly from the manufacturer or an authorized distributor. We carry only genuine, FDA-compliant medical supplies backed by full manufacturer warranties.",
  },
  {
    q: "Do you offer bulk or volume pricing?",
    a: "Yes. Approved B2B accounts receive volume discounts of up to 25%, net 30 payment terms, and a dedicated account manager. Apply via the Wholesale Pricing form at the bottom of this page.",
  },
  {
    q: "Can I pay with a purchase order or get net terms?",
    a: "Net 30 terms are available for approved B2B accounts. We also accept purchase orders from qualified institutions. Apply for a wholesale account to get started.",
  },
  {
    q: "How do I track my order?",
    a: "Once your order ships you'll receive a tracking confirmation email. You can also log into your account and view real-time status under 'My Orders.'",
  },
  {
    q: "Who do I contact for help?",
    a: "Our support team is available Monday–Friday, 8AM–6PM EST. Email support@mdsupplies.com or use the contact form. We respond to all inquiries within 2 hours during business hours.",
  },
];

export function FaqAccordion() {
  return (
    <div className="px-6 sm:px-8 pt-6 pb-4">
      <Accordion items={FAQ_ITEMS} />
    </div>
  );
}
