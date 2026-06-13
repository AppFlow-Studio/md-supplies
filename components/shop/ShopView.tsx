"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProductCard, type Product } from "./ProductCard";

// ─── Mock product data ────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: 1,  slug: "nitrile-gloves-green-xl",         brand: "Medline",       name: "8 Mil Nitrile Industrial Gloves, Diamond Textured, Green, XL (8104)",      price: 41.78, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["XS","S","M"],     inStock: true },
  { id: 2,  slug: "accusouch-latex-lg-case",          brand: "Medline",       name: "AccuTouch Latex Exam Gloves, Large, Powder Free, Case (6624)",              price: 56.99, image: "/images/pills_on_hands.png", category: "Latex",   sizes: ["M","L","XL"],    inStock: true },
  { id: 3,  slug: "venom-nitrile-black-lg",           brand: "Medline",       name: "AccuTouch Latex Exam Gloves, Large, Powder Free Case (6624)",                price: 38.50, image: "/images/pills_on_hands.png", category: "Latex",   sizes: ["S","M"],          inStock: true },
  { id: 4,  slug: "nitrile-industrial-green-xl-v2",   brand: "BD",            name: "8 Mil Nitrile Industrial Gloves, Diamond Textured, Green, XL (8104)",      price: 44.99, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["S","M","L"],     inStock: true },
  { id: 5,  slug: "accusouch-latex-pf-case",          brand: "Medline",       name: "AccuTouch Latex Exam Gloves, Large, Powder Free, Case (6624)",              price: 52.25, image: "/images/pills_on_hands.png", category: "Latex",   sizes: ["XS","S"],         inStock: true },
  { id: 6,  slug: "nitrile-industrial-xl-v3",         brand: "BD",            name: "8 Mil Nitrile Industrial Gloves, Diamond Textured, Green, XL (8104)",      price: 89.99, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["M","L","XL"],    inStock: false },
  { id: 7,  slug: "nitrile-industrial-green-xl-v4",   brand: "McKesson",      name: "8 Mil Nitrile Industrial Gloves, Diamond Textured, Green, XL (8104)",      price: 44.99, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["S","M","L"],     inStock: true },
  { id: 8,  slug: "aloetouch-green-nitrile",          brand: "Medline",       name: "Aloetouch Green Nitrile Exam Gloves",                                       price: 35.99, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["XS","S","M","L"], inStock: true,  freeShipping: true },
  { id: 9,  slug: "flexal-nitrile-chemo-rated",       brand: "BD",            name: "Flexal Nitrile Exam Gloves, Chemo Rated",                                   price: 71.50, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["M","XL"],         inStock: false },
  { id: 10, slug: "accusouch-latex-pf-xl",            brand: "McKesson",      name: "AccuTouch Latex Exam Gloves, XL, Powder Free, Case",                       price: 59.99, image: "/images/pills_on_hands.png", category: "Latex",   sizes: ["L","XL"],         inStock: true },
  { id: 11, slug: "vinyl-pf-lg-case",                 brand: "Dynarex",       name: "Vinyl Powder-Free Exam Gloves, Large, Case of 1000",                       price: 28.00, image: "/images/pills_on_hands.png", category: "Vinyl",   sizes: ["M","L","XL"],    inStock: true },
  { id: 12, slug: "vinyl-pf-md-case",                 brand: "Dynarex",       name: "Vinyl Powder-Free Exam Gloves, Medium, Case of 1000",                      price: 27.50, image: "/images/pills_on_hands.png", category: "Vinyl",   sizes: ["XS","S","M"],    inStock: true,  freeShipping: true },
  { id: 13, slug: "nitrile-xl-black-case",            brand: "BD",            name: "Venom Nitrile Exam Gloves, Black, XL, Case",                               price: 95.00, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["L","XL"],         inStock: true },
  { id: 14, slug: "latex-sterile-sm-pair",            brand: "Medline",       name: "SterX Latex Sterile Surgical Gloves, Small, Pair",                         price: 5.25,  image: "/images/pills_on_hands.png", category: "Latex",   sizes: ["XS","S"],         inStock: true },
  { id: 15, slug: "nitrile-blue-s-case",              brand: "McKesson",      name: "Nitrile Exam Gloves, Blue, Small, Case of 300",                            price: 32.75, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["XS","S"],         inStock: true },
  { id: 16, slug: "flexal-nitrile-lg",                brand: "McKesson",      name: "Flexal Nitrile Exam Gloves, Large, Case",                                  price: 63.00, image: "/images/pills_on_hands.png", category: "Nitrile", sizes: ["M","L","XL"],    inStock: true },
  { id: 17, slug: "latex-pf-md-case",                 brand: "Dynarex",       name: "Latex Powder-Free Exam Gloves, Medium, Case",                              price: 49.99, image: "/images/pills_on_hands.png", category: "Latex",   sizes: ["S","M"],          inStock: false },
  { id: 18, slug: "vinyl-sm-pf-case",                 brand: "BD",            name: "Vinyl Powder-Free Exam Gloves, Small, Case of 1000",                       price: 26.00, image: "/images/pills_on_hands.png", category: "Vinyl",   sizes: ["XS","S"],         inStock: true },
];

// ─── Filter option data ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { label: "Nitrile",  count: PRODUCTS.filter(p => p.category === "Nitrile").length },
  { label: "Latex",    count: PRODUCTS.filter(p => p.category === "Latex").length   },
  { label: "Vinyl",    count: PRODUCTS.filter(p => p.category === "Vinyl").length   },
];

const BRAND_OPTIONS = [
  { label: "BD",        count: PRODUCTS.filter(p => p.brand === "BD").length        },
  { label: "Medline",   count: PRODUCTS.filter(p => p.brand === "Medline").length   },
  { label: "McKesson",  count: PRODUCTS.filter(p => p.brand === "McKesson").length  },
  { label: "Dynarex",   count: PRODUCTS.filter(p => p.brand === "Dynarex").length   },
];

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];

const SORT_OPTIONS = [
  { value: "best-selling",   label: "Best Selling"        },
  { value: "price-asc",      label: "Price: Low to High"  },
  { value: "price-desc",     label: "Price: High to Low"  },
  { value: "newest",         label: "Newest"              },
];

const PRODUCTS_PER_PAGE = 9;
const MAX_PRICE = 200000;

// ─── Small components ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[20px] w-[36px] rounded-[12px] transition-colors shrink-0 ${checked ? "bg-teal-500" : "bg-gray-200"}`}
    >
      <span
        className={`absolute top-[2px] size-[16px] rounded-full bg-white shadow-[0px_1px_3px_rgba(16,24,40,0.1),0px_1px_2px_rgba(16,24,40,0.06)] transition-transform ${checked ? "translate-x-[18px]" : "translate-x-[2px]"}`}
      />
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`size-[16px] shrink-0 border flex items-center justify-center ${
        checked
          ? "bg-navy-900 border-navy-900"
          : "bg-white border-[rgba(102,102,100,0.6)]"
      }`}
    >
      {checked && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = SORT_OPTIONS.find(o => o.value === value)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2"
      >
        <span className="text-gray-500 text-[13px] tracking-[0.26px]">SORT BY:</span>
        <span className="text-navy-900 text-[15px] font-semibold tracking-[0.3px]">
          {selected.label}
        </span>
        <ChevronDown size={13} className={`text-navy-900 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-gray-200 shadow-md w-[200px]">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-[14px] hover:bg-neutral-50 transition-colors ${
                  opt.value === value ? "text-navy-900 font-semibold" : "text-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Filter sidebar content ───────────────────────────────────────────────────

function FilterSidebar({
  categories, setCategories,
  brands,     setBrands,
  sizes,      setSizes,
  priceMax,   setPriceMax,
  inStockOnly, setInStockOnly,
  onClearAll,
}: {
  categories: Set<string>;  setCategories: (v: Set<string>) => void;
  brands:     Set<string>;  setBrands:     (v: Set<string>) => void;
  sizes:      Set<string>;  setSizes:      (v: Set<string>) => void;
  priceMax:   number;       setPriceMax:   (v: number) => void;
  inStockOnly: boolean;     setInStockOnly: (v: boolean) => void;
  onClearAll: () => void;
}) {
  const toggle = <T extends string>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  };

  const hasFilters =
    categories.size > 0 || brands.size > 0 || sizes.size > 0 ||
    priceMax < MAX_PRICE || inStockOnly;

  return (
    <div className="flex flex-col">

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={onClearAll}
          className="text-teal-500 text-[13px] font-medium tracking-[0.26px] self-start mb-5 hover:underline"
        >
          Clear all filters
        </button>
      )}

      {/* CATEGORIES */}
      <div className="mb-8">
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] mb-3">
          CATEGORIES
        </p>
        <div className="h-px bg-gray-200 mb-5" />
        <div className="flex flex-col gap-[22px]">
          {CATEGORY_OPTIONS.map(({ label, count }) => (
            <label key={label} className="flex items-center gap-[14px] cursor-pointer">
              <Checkbox
                checked={categories.has(label)}
                onChange={() => setCategories(toggle(categories, label))}
              />
              <span className="flex-1 text-navy-900 text-[15px] tracking-[0.3px]">{label}</span>
              <span className="text-gray-500 text-[15px] tracking-[0.3px]">{count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* BRAND */}
      <div className="mb-8">
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] mb-3">
          BRAND
        </p>
        <div className="h-px bg-gray-200 mb-5" />
        <div className="flex flex-col gap-[22px]">
          {BRAND_OPTIONS.map(({ label, count }) => (
            <label key={label} className="flex items-center gap-[14px] cursor-pointer">
              <Checkbox
                checked={brands.has(label)}
                onChange={() => setBrands(toggle(brands, label))}
              />
              <span className="flex-1 text-navy-900 text-[15px] tracking-[0.3px]">{label}</span>
              <span className="text-gray-500 text-[15px] tracking-[0.3px]">{count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* SIZE */}
      <div className="mb-8">
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] mb-3">
          SIZE
        </p>
        <div className="h-px bg-gray-200 mb-5" />
        <div className="grid grid-cols-3 gap-3">
          {SIZE_OPTIONS.map(size => (
            <button
              key={size}
              onClick={() => setSizes(toggle(sizes, size))}
              className={`h-[50px] text-[15px] font-semibold tracking-[0.3px] transition-colors ${
                sizes.has(size)
                  ? "bg-navy-900 text-white"
                  : "border border-[rgba(102,102,100,0.4)] text-navy-900 hover:border-navy-900"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* PRICE RANGE */}
      <div className="mb-8">
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] mb-3">
          PRICE RANGE
        </p>
        <div className="h-px bg-gray-200 mb-5" />
        {/* Track + handle */}
        <div className="relative h-[6px] my-6">
          <div className="absolute inset-0 bg-gray-200 rounded-full" />
          <div
            className="absolute inset-y-0 left-0 bg-navy-900 rounded-full"
            style={{ width: `${(priceMax / MAX_PRICE) * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={MAX_PRICE}
            step={1000}
            value={priceMax}
            onChange={e => setPriceMax(+e.target.value)}
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <div className="flex justify-between">
          <span className="text-navy-900 text-[14px] tracking-[0.28px]">$0.00</span>
          <span className="text-navy-900 text-[14px] tracking-[0.28px]">
            {priceMax >= MAX_PRICE ? "$200,000 +" : `$${priceMax.toLocaleString()}.00`}
          </span>
        </div>
      </div>

      {/* IN STOCK ONLY */}
      <div>
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] mb-3">
          IN STOCK ONLY
        </p>
        <div className="h-px bg-gray-200 mb-5" />
        <div className="flex items-center justify-between">
          <span className="text-navy-900 text-[15px] tracking-[0.3px]">
            {inStockOnly ? "Showing in-stock items" : "Showing all items"}
          </span>
          <Toggle checked={inStockOnly} onChange={setInStockOnly} />
        </div>
      </div>

    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );
  const withEllipsis: (number | "…")[] = [];
  for (let i = 0; i < visible.length; i++) {
    if (i > 0 && visible[i] - visible[i - 1] > 1) withEllipsis.push("…");
    withEllipsis.push(visible[i]);
  }

  return (
    <nav className="flex items-center justify-center gap-1 pt-10" aria-label="Pagination">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center text-navy-900 disabled:opacity-30 hover:text-teal-500 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft size={18} />
      </button>

      {withEllipsis.map((item, i) =>
        item === "…" ? (
          <span key={`ell-${i}`} className="w-10 h-10 flex items-center justify-center text-gray-500 text-[13px]">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item as number)}
            className={`w-10 h-10 flex items-center justify-center text-[13px] font-semibold tracking-[0.26px] rounded-full transition-colors ${
              currentPage === item
                ? "bg-navy-900 text-white"
                : "text-navy-900 hover:text-teal-500"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center text-navy-900 disabled:opacity-30 hover:text-teal-500 transition-colors"
        aria-label="Next"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ShopView() {
  const [categories,   setCategories]   = useState<Set<string>>(new Set());
  const [brands,       setBrands]       = useState<Set<string>>(new Set());
  const [sizes,        setSizes]        = useState<Set<string>>(new Set());
  const [priceMax,     setPriceMax]     = useState(MAX_PRICE);
  const [inStockOnly,  setInStockOnly]  = useState(false);
  const [sortBy,       setSortBy]       = useState("best-selling");
  const [page,         setPage]         = useState(1);
  const [filtersOpen,  setFiltersOpen]  = useState(false);

  const clearAll = () => {
    setCategories(new Set());
    setBrands(new Set());
    setSizes(new Set());
    setPriceMax(MAX_PRICE);
    setInStockOnly(false);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (categories.size) list = list.filter(p => categories.has(p.category));
    if (brands.size)     list = list.filter(p => brands.has(p.brand));
    if (sizes.size)      list = list.filter(p => p.sizes.some(s => sizes.has(s)));
    list = list.filter(p => p.price <= priceMax);
    if (inStockOnly)     list = list.filter(p => p.inStock);
    switch (sortBy) {
      case "price-asc":  list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
    }
    return list;
  }, [categories, brands, sizes, priceMax, inStockOnly, sortBy]);

  const totalPages  = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  const start       = (page - 1) * PRODUCTS_PER_PAGE;
  const visible     = filtered.slice(start, start + PRODUCTS_PER_PAGE);

  const handleFilterChange = (setter: () => void) => {
    setter();
    setPage(1);
  };

  return (
    <>
      {/* Breadcrumbs */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <span className="text-gray-500">Gloves</span>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">Exam Gloves</span>
        </nav>
      </div>

      {/* Page header */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-6">
        <h1 className="text-navy-900 text-[20px] font-semibold tracking-[0.4px]">
          Exam Gloves
        </h1>
        <p className="text-gray-500 text-[15px] tracking-[0.3px] mt-1">
          ({filtered.length} products)
        </p>
      </div>

      {/* Mobile filter bar */}
      <div className="lg:hidden max-w-360 mx-auto px-4 sm:px-8 pb-4 flex items-center justify-between">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 border border-navy-900 px-4 h-[40px] text-navy-900 text-[14px] font-semibold"
        >
          <SlidersHorizontal size={16} />
          Filters
          {(categories.size + brands.size + sizes.size > 0 || inStockOnly) && (
            <span className="bg-navy-900 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {categories.size + brands.size + sizes.size + (inStockOnly ? 1 : 0)}
            </span>
          )}
        </button>
        <SortDropdown value={sortBy} onChange={v => { setSortBy(v); setPage(1); }} />
      </div>

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-20 flex gap-0 items-start">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[337px] shrink-0 pr-10">
          <FilterSidebar
            categories={categories}    setCategories={v => handleFilterChange(() => setCategories(v))}
            brands={brands}            setBrands={v => handleFilterChange(() => setBrands(v))}
            sizes={sizes}              setSizes={v => handleFilterChange(() => setSizes(v))}
            priceMax={priceMax}        setPriceMax={v => handleFilterChange(() => setPriceMax(v))}
            inStockOnly={inStockOnly}  setInStockOnly={v => handleFilterChange(() => setInStockOnly(v))}
            onClearAll={clearAll}
          />
        </aside>

        {/* Product area */}
        <div className="flex-1 min-w-0">

          {/* Desktop sort */}
          <div className="hidden lg:flex justify-end mb-6">
            <SortDropdown value={sortBy} onChange={v => { setSortBy(v); setPage(1); }} />
          </div>

          {/* Product grid */}
          {visible.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[23px]">
              {visible.map(product => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-navy-900 text-[20px] font-semibold">No products found</p>
              <p className="text-gray-500 text-[15px]">Try adjusting or clearing your filters.</p>
              <button
                onClick={clearAll}
                className="mt-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] hover:bg-neutral-50 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.2)] lg:hidden"
          onClick={e => { if (e.target === e.currentTarget) setFiltersOpen(false); }}
        >
          <div className="absolute inset-y-0 left-0 w-[320px] max-w-full bg-white overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <span className="text-navy-900 text-[18px] font-semibold">Filters</span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-navy-900 hover:text-teal-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              <FilterSidebar
                categories={categories}    setCategories={v => handleFilterChange(() => setCategories(v))}
                brands={brands}            setBrands={v => handleFilterChange(() => setBrands(v))}
                sizes={sizes}              setSizes={v => handleFilterChange(() => setSizes(v))}
                priceMax={priceMax}        setPriceMax={v => handleFilterChange(() => setPriceMax(v))}
                inStockOnly={inStockOnly}  setInStockOnly={v => handleFilterChange(() => setInStockOnly(v))}
                onClearAll={clearAll}
              />
            </div>
            <div className="px-6 pb-8">
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-full bg-navy-900 text-white h-[52px] text-[16px] font-semibold hover:bg-navy-950 transition-colors"
              >
                Show {filtered.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
