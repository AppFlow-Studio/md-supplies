import type { Metadata } from "next";
import { ShopView } from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: "Shop Exam Gloves | MD Supplies",
  description:
    "Browse 4,000+ medical supplies — nitrile, latex, and vinyl exam gloves with wholesale pricing and same-day shipping.",
};

export default function ShopPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <ShopView />
    </main>
  );
}
