import Link from "next/link";
import {
  Syringe,
  ShieldCheck,
  TestTube,
  Scissors,
  Bandage,
  Wind,
  Stethoscope,
  Accessibility,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORIES: { name: string; href: string; Icon: LucideIcon }[] = [
  { name: "Needles & Syringes",  href: "/categories/needles-syringes",  Icon: Syringe       },
  { name: "PPE",                 href: "/categories/ppe",                Icon: ShieldCheck   },
  { name: "Testing",             href: "/categories/testing",            Icon: TestTube      },
  { name: "Surgical Sutures",    href: "/categories/surgical-sutures",   Icon: Scissors      },
  { name: "Wound Care",          href: "/categories/wound-care",         Icon: Bandage       },
  { name: "Respiratory",         href: "/categories/respiratory",        Icon: Wind          },
  { name: "Exam Room",           href: "/categories/exam-room",          Icon: Stethoscope   },
  { name: "Mobility",            href: "/categories/mobility",           Icon: Accessibility },
];

export function PopularCategories() {
  return (
    <section className="w-full bg-white">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Popular Categories
          </h2>
          <Link
            href="/categories"
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            Browse all categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
          {CATEGORIES.map(({ name, href, Icon }) => (
            <Link
              key={name}
              href={href}
              className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-10 px-4"
            >
              <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                <Icon size={22} className="text-teal-500" strokeWidth={1.5} />
              </div>
              <span className="text-[15px] font-semibold text-navy-900 text-center leading-snug">
                {name}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
