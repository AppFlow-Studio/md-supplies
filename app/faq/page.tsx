import { FaqAccordion }    from "@/components/faq/FaqAccordion";
import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
import { WholesalePricing } from "@/components/home/WholesalePricing";
import { FadeIn } from "@/components/ui/FadeIn";

const _faqCanonical = buildCanonical({ path: '/faq' })
export const metadata = {
  title: 'FAQ | MDSupplies',
  description: 'Frequently asked questions about MD Supplies — shipping, returns, and product authenticity.',
  robots: buildRobots({ pageType: 'homepage' }), // non-utility type → index,follow; staging guard applied
  alternates: { canonical: _faqCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'FAQ | MDSupplies',
    description: 'Frequently asked questions about MD Supplies — shipping, returns, and product authenticity.',
    url: _faqCanonical,
  }),
}

export default function FaqPage() {
  return (
    <main>

      {/* ── Hero + Accordion ── */}
      <section className="w-full bg-neutral-100 overflow-x-hidden">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 xl:gap-20">

            {/* Left info panel */}
            <div className="lg:w-77 xl:w-90 shrink-0 flex flex-col gap-5">

              <FadeIn delay={0}>
                <p className="text-teal-500 text-[13px] sm:text-[15px] font-semibold tracking-[0.75px] uppercase">
                  Support
                </p>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h1 className="text-[40px] sm:text-[50px] font-semibold text-navy-900 leading-[1.1] tracking-tight">
                  Frequently
                  <br />
                  Asked
                  <br />
                  Questions
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p className="text-gray-500 text-[15px] leading-[1.65] max-w-80">
                  For order questions or anything not answered
                  below, our support team responds within 2 hours.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <a
                  href="mailto:support@mdsupplies.com"
                  className="text-teal-500 text-[13px] sm:text-[15px] font-semibold tracking-[0.75px] uppercase hover:underline break-all"
                >
                  SUPPORT@MDSUPPLIES.COM
                </a>
              </FadeIn>

            </div>

            {/* Right: accordion on white card */}
            <FadeIn delay={0.1} className="flex-1 min-w-0 lg:max-[1449px]:-mr-14">
              <div className="bg-white">
                <FaqAccordion />
              </div>
            </FadeIn>

          </div>
        </div>
      </section>

      {/* ── Wholesale CTA (reused) ── */}
      <WholesalePricing />

    </main>
  );
}
