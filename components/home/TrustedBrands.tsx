"use client";

import { useState } from "react";
import { FadeIn } from "@/components/ui/FadeIn";

const BRANDS = [
  { name: "Cardinal Health", img: "/images/brands/cardinal-health.png" },
  { name: "Covidien",        img: "/images/brands/covidien.jpg" },
  { name: "Dynarex",         img: "/images/brands/dynarex.png" },
  { name: "BD",              img: "/images/brands/bd.svg" },
];

function BrandLogo({ name, img }: { name: string; img: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="font-extrabold text-[14px] sm:text-[17px] tracking-[0.06em] text-[rgba(6,13,25,0.25)] select-none">
        {name.toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt={name}
      className="h-7 sm:h-9 w-auto max-w-30 sm:max-w-37.5 object-contain grayscale opacity-50 hover:opacity-90 hover:grayscale-0 transition-all duration-300"
      onError={() => setFailed(true)}
    />
  );
}

export function TrustedBrands() {
  return (
    <section className="w-full bg-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.05)]">
      <FadeIn className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 md:py-10">
        <p className="text-center text-[12px] sm:text-[13px] font-semibold text-gray-500 tracking-[0.12em] uppercase mb-7">
          Trusted Brands We Carry
        </p>
        <div className="flex items-center gap-8 sm:gap-4 overflow-x-auto sm:overflow-visible sm:justify-between pb-1 sm:pb-0 scrollbar-hide">
          {BRANDS.map((brand) => (
            <div key={brand.name} className="shrink-0 sm:shrink-0 flex items-center justify-center min-w-25 sm:flex-1">
              <BrandLogo {...brand} />
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
