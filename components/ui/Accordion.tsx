"use client";

import { useState } from "react";

interface AccordionItem {
  q: string;
  a: string;
}

interface Props {
  items: AccordionItem[];
  initialOpen?: number;
}

export function Accordion({ items, initialOpen = 0 }: Props) {
  const [openIdx, setOpenIdx] = useState<number>(initialOpen);

  return (
    <div>
      {items.map(({ q, a }, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={q} className="border-b border-gray-200 last:border-0">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-6 py-5 text-left group"
            >
              <span
                className={`text-[18px] font-medium leading-[1.45] transition-colors ${
                  isOpen ? "text-navy-900" : "text-navy-900 group-hover:text-teal-500"
                }`}
              >
                {q}
              </span>
              <span
                className="shrink-0 text-teal-500 text-[22px] font-light leading-none transition-transform duration-300 select-none"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                aria-hidden
              >
                +
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="pb-6 text-[15px] text-gray-500 leading-[1.65]">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
