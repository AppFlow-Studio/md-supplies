import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export interface Product {
  id: number;
  slug: string;
  brand: string;
  name: string;
  price: number;
  image: string;
  category: string;
  sizes: string[];
  inStock: boolean;
  freeShipping?: boolean;
}

export function ProductCard({ id, slug, brand, name, price, image, freeShipping }: Product) {
  return (
    <Link href={`/shop/${slug}`} className="group bg-white flex flex-col">

      {/* Image */}
      <div className="relative overflow-hidden bg-white aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          className="size-full object-contain"
        />

        {freeShipping && (
          <span className="absolute top-0 left-0 bg-[#006e46] text-[#f9fafc] text-[13px] font-semibold h-[31px] px-4 flex items-center tracking-[0.26px]">
            FREE SHIPPING
          </span>
        )}

        {/* Add to cart overlay on hover */}
        <div className="absolute inset-x-0 bottom-0 h-[43px] bg-navy-900 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <ShoppingCart size={14} className="text-white" />
          <span className="text-white text-[12px] font-medium tracking-[0.24px]">Add to cart</span>
        </div>
      </div>

      {/* Info */}
      <div className="px-[22px] pt-[19px] pb-[22px] flex flex-col">
        <span className="text-teal-500 text-[13px] font-semibold tracking-[0.26px] uppercase leading-[25px]">
          {brand}
        </span>
        <p className="text-black text-[14px] font-semibold tracking-[0.28px] leading-5 line-clamp-2 mb-[30px]">
          {name}
        </p>
        <span className="text-black text-[18px] font-bold tracking-[0.36px]">
          ${price.toFixed(2)}
        </span>
      </div>

    </Link>
  );
}
