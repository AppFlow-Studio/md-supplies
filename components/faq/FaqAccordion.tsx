import { Accordion } from "@/components/ui/Accordion";
import { FAQSchema } from "@/components/schema/FAQSchema";
import { SITE_CONTACT } from "@/lib/site-contact";
import { RETURN_POLICY_PLAIN_TEXT } from "@/lib/policy/return-policy";

const FAQ_ITEMS = [
  {
    question: "Who can order from MDSupplies?",
    answer: "Anyone can order. MDSupplies is open to healthcare facilities, clinics, care teams, organizations, businesses, and individual customers. Most products are available for direct online ordering with no credentials required. A small number of regulated items may require professional verification at checkout — you'll be prompted if that applies to your order.",
  },
  {
    question: "How long does shipping take?",
    answer: "Orders are processed through trusted medical supply partners, with shipping details and options provided at checkout.",
  },
  {
    question: "How is shipping calculated?",
    answer: "Shipping rates and availability depend on the vendor and your order details. All options and costs are shown at checkout before you place your order.",
  },
  {
    question: "Do you accept insurance?",
    answer: "We do not bill insurance directly. However, we provide itemized invoices and order documentation that many customers use for insurance reimbursement claims.",
  },
  {
    question: "Do I need a prescription to order?",
    answer: "Most products do not require a prescription and can be sold directly to licensed healthcare facilities. Certain regulated items may require valid professional credentials, which you will be prompted to provide at checkout.",
  },
  {
    question: "What's your return policy?",
    // DEV-POLICY-01: the approved plan §7.2 copy, verbatim, from the central
    // policy module — this FAQ can never drift from /returns or the PDP tab.
    answer: RETURN_POLICY_PLAIN_TEXT,
  },
  {
    question: "Are your products authentic?",
    answer: "Absolutely. Every product is sourced directly from the manufacturer or an authorized distributor. We carry only genuine, FDA-compliant medical supplies backed by full manufacturer warranties.",
  },
  {
    question: "How do I track my order?",
    answer: "Once your order ships you'll receive a tracking confirmation email. You can also log into your account and view real-time status under 'My Orders.'",
  },
  {
    question: "Who do I contact for help?",
    // Interpolated rather than written out, so the FAQ cannot disagree with the
    // footer and the schema the way it did before (IZ-COMMS-01).
    // No response-time promise: "within 2 hours" was an unsupported service
    // claim (client-liability stop rule) — removed pending written approval.
    answer: `Our support team is available Monday–Friday, 8AM–6PM EST. Email ${SITE_CONTACT.email} or use the contact form.`,
  },
];

export function FaqAccordion() {
  const items = FAQ_ITEMS.map(({ question, answer }) => ({ q: question, a: answer }));
  return (
    <div className="px-6 sm:px-8 pt-6 pb-4">
      <Accordion items={items} />
      <FAQSchema faq={FAQ_ITEMS} />
    </div>
  );
}
