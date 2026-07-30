import { FadeIn } from "@/components/ui/FadeIn";

interface Props {
  title:               string;
  description:         string;
  programExplanation:  string;
  freeShippingMessage: string;
}

export function AnimatedOCCHeroSection({
  title,
  description,
  programExplanation,
  freeShippingMessage,
}: Props) {
  return (
    <div className="flex flex-col w-full h-full gap-8 relative">

      {/* Right: hero image — bleeds to the viewport edge and spans the full
          height of the left column (text + card) stacked beside it */}
      <FadeIn
        from="right"
        delay={0.15}
        className="order-2 relative w-full h-[260px] sm:h-[360px] lg:absolute lg:-top-[100px] lg:right-0 lg:left-[50%] lg:h-[720px] lg:w-[950px] lg:max-[1449px]:-mr-14 overflow-hidden"
      >{/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/occ-hero.png"
          alt="Volunteers packing Operation Christmas Child shoebox gifts"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </FadeIn>

      {/* Left: text column */}
      <div className="order-1 lg:w-[50%] shrink-0 flex flex-col gap-5 lg:gap-6">
        <FadeIn as="p" delay={0.05} className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase">
          Operation Christmas Child
        </FadeIn>

        <FadeIn as="h1" delay={0.15} className="text-[44px] sm:text-[50px] font-semibold text-navy-900 leading-[1.2] tracking-tight">
          {title}
        </FadeIn>

        <FadeIn as="p" delay={0.25} className="text-[18px] font-medium text-[#666664] leading-[30px]">
          {description}
        </FadeIn>
      </div>

      {/* Program explanation card — stacked directly below the text, on the
          left, alongside the full-height image on the right */}
      <FadeIn
        delay={0.45}
        className="order-3 relative z-10 flex flex-col gap-5 bg-white px-8 py-8 lg:px-10 w-full lg:w-[60%]"
      >
        <h2 className="text-[30px] font-bold text-navy-900 tracking-[0.6px]">
          About the OCC Collection
        </h2>
        <p className="text-[18px] text-[#666664] font-medium leading-[30px]">
          {programExplanation}
        </p>
        {freeShippingMessage && (
          <div className="flex items-start gap-3">
            <span className="text-[#4badcd] font-bold text-[16px] leading-[1.65] shrink-0">✓</span>
            <p className="text-[16px] text-[#4badcd] font-semibold leading-[1.65]">
              {freeShippingMessage}
            </p>
          </div>
        )}
      </FadeIn>

    </div>
  );
}
