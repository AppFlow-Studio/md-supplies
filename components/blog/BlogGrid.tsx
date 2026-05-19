"use client";

import { useState } from "react";
import { BlogCard, type BlogPost } from "./BlogCard";
import { Pagination } from "./Pagination";

const ALL_POSTS: BlogPost[] = [
  {
    slug: "best-trocar-kits-hrt-clinics",
    date: "October 11, 2025",
    title: "Best Trocar Kits for Hormone Pellet Therapy | Fast US Shipping for HRT Clinics",
    excerpt:
      "Choosing the right trocar kit is critical for safe and efficient hormone pellet implantation. We break down the top options stocked at MD Supplies, compare gauge sizes, and explain what fast US shipping means for your clinic's workflow.",
  },
  {
    slug: "urgent-care-supply-checklist",
    date: "October 5, 2025",
    title: "Ready to Open an Urgent Care Clinic? Here's the Full Medical Supply Checklist You'll Need",
    excerpt:
      "From exam gloves and wound care to crash carts and diagnostic equipment, we've compiled the definitive checklist for urgent care facilities opening their doors for the first time.",
  },
  {
    slug: "ems-supply-restocking-guide",
    date: "September 28, 2025",
    title: "EMS Supply Restocking Guide: How to Keep Your Units Fully Stocked Between Calls",
    excerpt:
      "Downtime between calls is your window to restock. Learn which supplies EMS units deplete fastest, how to set reorder points, and how MD Supplies' bulk pricing helps agencies stay prepared.",
  },
  {
    slug: "iv-catheter-selection",
    date: "September 20, 2025",
    title: "IV Catheter Selection: Choosing the Right Gauge for Your Patient Population",
    excerpt:
      "Not all IV catheters are created equal. This guide covers gauge selection by patient type, flow rate requirements, and which brands our wholesale customers rely on most.",
  },
  {
    slug: "wound-care-dressings-comparison",
    date: "September 14, 2025",
    title: "Wound Care Dressings Compared: Foam, Hydrocolloid, Alginate, and More",
    excerpt:
      "Modern wound care offers a dressing for every wound type. We compare absorption levels, change frequencies, and cost-effectiveness to help you stock the right products.",
  },
  {
    slug: "net30-benefits-healthcare",
    date: "September 7, 2025",
    title: "Why Net 30 Payment Terms Are a Game-Changer for Healthcare Facilities",
    excerpt:
      "Cash flow is the lifeblood of any healthcare practice. Discover how Net 30 terms through MD Supplies' wholesale program free up capital and simplify accounts payable.",
  },
  {
    slug: "sterile-gloves-guide",
    date: "August 30, 2025",
    title: "Sterile vs. Exam Gloves: When to Use Each and How to Order in Bulk",
    excerpt:
      "Understanding glove classifications keeps your team compliant and your patients safe. We explain the key differences and share volume pricing tiers for facilities ordering cases.",
  },
  {
    slug: "pharmacy-supply-essentials",
    date: "August 22, 2025",
    title: "Pharmacy Supply Essentials: What Every Independent Pharmacy Should Stock",
    excerpt:
      "Independent pharmacies face unique inventory pressures. From pill counters to compounding supplies, MD Supplies covers the consumables that keep dispensing operations running smoothly.",
  },
  {
    slug: "physical-therapy-equipment-checklist",
    date: "August 15, 2025",
    title: "Physical Therapy Equipment Checklist for New Clinics and Expanding Practices",
    excerpt:
      "Opening a PT clinic or expanding to a second location requires careful supply planning. This checklist covers therapeutic modalities, exercise consumables, and documentation supplies.",
  },
  {
    slug: "fda-compliance-medical-supplies",
    date: "August 8, 2025",
    title: "FDA Compliance 101: How to Verify Your Medical Supply Source Is Legitimate",
    excerpt:
      "With counterfeit medical supplies on the rise, knowing how to vet your distributor is critical. Learn the red flags to watch for and why MD Supplies sources exclusively from authorized channels.",
  },
  {
    slug: "bulk-ordering-tips",
    date: "August 1, 2025",
    title: "5 Tips for Smarter Bulk Ordering That Reduce Waste and Cut Costs",
    excerpt:
      "Overordering leads to expired stock; underordering causes last-minute rush fees. These five strategies help healthcare buyers find the right balance and maximize their wholesale discounts.",
  },
  {
    slug: "home-care-supply-essentials",
    date: "July 25, 2025",
    title: "Home Care Supply Essentials: Equipping Aides and Patients for Safe In-Home Treatment",
    excerpt:
      "Home care agencies need reliable, affordable consumables to support patient independence. Explore our most-ordered categories for home health — from wound care to mobility aids.",
  },
];

const POSTS_PER_PAGE = 9;
const TOTAL_PAGES = Math.ceil(ALL_POSTS.length / POSTS_PER_PAGE);

export function BlogGrid() {
  const [page, setPage] = useState(1);

  const start = (page - 1) * POSTS_PER_PAGE;
  const visiblePosts = ALL_POSTS.slice(start, start + POSTS_PER_PAGE);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px] gap-y-0">
        {visiblePosts.map((post) => (
          <BlogCard key={post.slug} {...post} />
        ))}
      </div>

      <Pagination currentPage={page} totalPages={TOTAL_PAGES} onPageChange={setPage} />
    </div>
  );
}
