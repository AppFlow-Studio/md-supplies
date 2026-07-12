"use client";

import { useState } from "react";
import { FadeIn } from "@/components/ui/FadeIn";
import { HOMEPAGE_BRANDS_WITH_LOGO, brandLogoUrl } from "@/lib/brands";

// Approved homepage brands (§6.1) that have a verified BunnyCDN logo. Brands without
// a confirmed logo are intentionally omitted here rather than shown as a broken image.
const BRANDS = HOMEPAGE_BRANDS_WITH_LOGO.map((b) => ({
  name: b.name,
  img: brandLogoUrl(b)!,
  width: b.logoWidth,
  height: b.logoHeight,
}));

// Self-contained marquee styles. Kept in-component (not globals.css) so the carousel
// is fully portable and never depends on the global stylesheet. The track holds two
// identical copies of the logo set; each item carries its own trailing margin, so the
// set width is exactly periodic and translating by -50% loops with no visible jump.
const MARQUEE_CSS = `
.tb-marquee {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 5%, #000 95%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0, #000 5%, #000 95%, transparent 100%);
}
.tb-marquee-track {
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  animation: tb-marquee-scroll 100s linear infinite;
}
.tb-marquee:hover .tb-marquee-track { animation-play-state: paused; }
@keyframes tb-marquee-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .tb-marquee-track { animation: none; }
}
`;

interface BrandLogoProps {
  name: string;
  img: string;
  width?: number;
  height?: number;
}

function BrandLogo({ name, img, width, height }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="font-extrabold text-[15px] sm:text-[17px] tracking-[0.06em] text-[rgba(6,13,25,0.3)] select-none whitespace-nowrap">
        {name.toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt={name}
      width={width}
      height={height}
      className="h-8 sm:h-10 w-auto max-w-[160px] object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
      onError={() => setFailed(true)}
    />
  );
}

// A single logo cell. ~22px trailing gap keeps even spacing and makes the
// -50% marquee loop perfectly periodic.
function BrandCell({ hidden, ...logo }: BrandLogoProps & { hidden?: boolean }) {
  return (
    <div
      className="mr-[22px] flex shrink-0 items-center justify-center"
      aria-hidden={hidden || undefined}
    >
      <BrandLogo {...logo} />
    </div>
  );
}

export function TrustedBrands() {
  return (
    <section className="w-full bg-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.05)]">
      <style>{MARQUEE_CSS}</style>
      <FadeIn className="py-8 md:py-10">
        <p className="text-center text-[12px] sm:text-[13px] font-semibold text-gray-500 tracking-[0.12em] uppercase mb-7">
          Trusted Brands We Carry
        </p>
        <div className="tb-marquee w-full" aria-label="Trusted brands we carry">
          <div className="tb-marquee-track">
            {/* First copy — the visible set */}
            {BRANDS.map((brand) => (
              <BrandCell key={`a-${brand.name}`} {...brand} />
            ))}
            {/* Second copy — duplicate for the seamless loop (hidden from a11y) */}
            {BRANDS.map((brand) => (
              <BrandCell key={`b-${brand.name}`} {...brand} hidden />
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
