import { Truck, ShieldCheck, Tag, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";

const FEATURES: { Icon: LucideIcon; title: string; description: string }[] = [
  {
    Icon: Truck,
    title: "Reliable Fulfillment",
    description: "Orders are processed through trusted medical supply partners with clear product and shipping details.",
  },
  {
    Icon: ShieldCheck,
    title: "100% Authentic",
    description: "Every product is genuine and sourced directly from the manufacturers",
  },
  {
    Icon: Tag,
    title: "Competitive Pricing",
    description: "Transparent pricing across medical supply categories, with no inflated markups.",
  },
  {
    Icon: RotateCcw,
    title: "Easy Returns",
    description: "Hassle-free returns on unopened products",
  },
];

function FeatureCard({ Icon, title, description }: (typeof FEATURES)[0]) {
  return (
    <div className="flex flex-col gap-3 p-6 md:p-8 lg:p-10">
      <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.2)] flex items-center justify-center shrink-0">
        <Icon size={22} className="text-teal-300" strokeWidth={1.5} />
      </div>
      <p className="text-white text-[16px] font-bold tracking-[0.32px]">{title}</p>
      <p className="text-white text-[14px] font-normal tracking-[0.28px] leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  );
}

export function WhyChooseUs() {
  return (
    <section className="w-full bg-navy-900">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn>
          <h2 className="text-[28px] font-semibold text-white text-center tracking-[0.56px] mb-10">
            Why Healthcare Professionals Choose Us
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <FadeIn><FeatureCard {...FEATURES[0]} /></FadeIn>
          <FadeIn delay={0.08}><FeatureCard {...FEATURES[1]} /></FadeIn>
          <div className="sm:col-span-2 h-px bg-white/10" />
          <FadeIn delay={0.16}><FeatureCard {...FEATURES[2]} /></FadeIn>
          <FadeIn delay={0.24}><FeatureCard {...FEATURES[3]} /></FadeIn>
        </div>

      </div>
    </section>
  );
}
