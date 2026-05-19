import Link from "next/link";
import { Star, Plus } from "lucide-react";

// Figma asset URLs — replace with permanent CDN once available
const PRODUCTS = [
  {
    brand: "MEDCHAIN",
    inStock: true,
    name: "3M N95 Regular Particulate Respirator Mask, Molded Cone, Box (1860)",
    price: "$41.78",
    img: "https://www.figma.com/api/mcp/asset/74ba38c1-0c87-488b-8cbb-585446711a84",
    href: "/products/3m-n95-1860",
  },
  {
    brand: "CARDINAL",
    inStock: true,
    name: "Nitrile Exam Gloves, Powder-Free, Medium, Box of 100",
    price: "$12.99",
    img: "https://www.figma.com/api/mcp/asset/226d283f-825f-471a-b2c6-f75a4c4758fd",
    href: "/products/nitrile-exam-gloves",
  },
  {
    brand: "MEDLINE",
    inStock: true,
    name: "Digital Non-Contact Infrared Thermometer, Professional Grade",
    price: "$28.50",
    img: "https://www.figma.com/api/mcp/asset/356abec0-5f2d-491a-b744-aea8cfc297a2",
    href: "/products/digital-thermometer",
  },
  {
    brand: "DYNAREX",
    inStock: false,
    name: "Sterile Gauze Bandages 4\"×4\", Non-Woven, Box of 200",
    price: "$8.99",
    img: "https://www.figma.com/api/mcp/asset/111e9c13-d77a-4538-a51b-96a4947d03b4",
    href: "/products/sterile-gauze-bandages",
  },
];

export function PopularProducts() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] mb-8">
          Popular products
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRODUCTS.map(({ brand, inStock, name, price, img, href }) => (
            <div key={name} className="bg-white flex flex-col">

              {/* Product image */}
              <Link href={href} className="group overflow-hidden aspect-square bg-gray-50 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </Link>

              {/* Product info */}
              <div className="flex flex-col gap-1.5 p-3 flex-1">

                {/* Brand + stock */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-teal-500 tracking-[0.26px]">
                    {brand}
                  </span>
                  <span className="text-[13px] font-semibold text-gray-500/60 tracking-[0.26px]">
                    {inStock ? "in stock" : "out of stock"}
                  </span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      className="text-[#f5a623] fill-[#f5a623]"
                    />
                  ))}
                </div>

                {/* Name */}
                <p className="text-[14px] font-semibold text-black leading-snug line-clamp-3">
                  {name}
                </p>

                {/* Price */}
                <p className="text-[18px] font-bold text-black tracking-[0.36px] mt-auto pt-1">
                  {price} USD
                </p>

                {/* Quick Add */}
                <Link
                  href={href}
                  className="mt-2 bg-navy-900 text-white text-[12px] font-semibold text-center py-2.5 flex items-center justify-center gap-1.5 hover:bg-navy-950 transition-colors"
                >
                  <Plus size={13} />
                  Quick Add
                </Link>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
