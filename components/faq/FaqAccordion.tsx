import { Accordion } from "@/components/ui/Accordion";

const FAQ_ITEMS = [
  {
    q: "Who can order from MDSupplies?",
    a: "Anyone can order. MDSupplies is open to healthcare facilities, clinics, care teams, organizations, businesses, and individual customers. Most products are available for direct online ordering with no credentials required. A small number of regulated items may require professional verification at checkout — you'll be prompted if that applies to your order.",
  },
  {
    q: "How long does shipping take?",
    a: "Orders are processed through trusted medical supply partners, with shipping details and options provided at checkout.",
  },
  {
    q: "How is shipping calculated?",
    a: "Shipping rates and availability depend on the vendor and your order details. All options and costs are shown at checkout before you place your order.",
  },
  {
    q: "Do you accept insurance?",
    a: "We do not bill insurance directly. However, we provide itemized invoices and order documentation that many customers use for insurance reimbursement claims.",
  },
  {
    q: "Do I need a prescription to order?",
    a: "Most products do not require a prescription and can be sold directly to licensed healthcare facilities. Certain regulated items may require valid professional credentials, which you will be prompted to provide at checkout.",
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
