export interface ProductUnit {
  label: string;
  qtyLabel: string;
  price: number;
  priceLabel: string;
}

export interface RelatedProduct {
  id: number;
  slug: string;
  brand: string;
  name: string;
  price: number;
  image: string;
}

export interface AccessoryProduct {
  id: number;
  name: string;
  price: number;
  image: string;
}

export interface ProductDetailData {
  id: number;
  slug: string;
  brand: string;
  sku: string;
  name: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  freeShipping: boolean;
  images: string[];
  units: ProductUnit[];
  strikePrice?: number;
  savePct?: number;
  saleLabel?: string;
  description: string;
  keyFeatures: string[];
  specifications: { label: string; value: string }[];
  orderingInfo: string;
  commonlyPurchasedWith: RelatedProduct[];
  youMayAlsoNeed: AccessoryProduct[];
}

const PLACEHOLDER = "/images/pills_on_hands.png"

// Product images
const IMG = {
  main:     PLACEHOLDER,
  thumb1:   PLACEHOLDER,
  thumb2:   PLACEHOLDER,
  thumb3:   PLACEHOLDER,
  thumb4:   PLACEHOLDER,
  thumb5:   PLACEHOLDER,
  related1: PLACEHOLDER,
  related2: PLACEHOLDER,
  related3: PLACEHOLDER,
  related4: PLACEHOLDER,
  saline:   PLACEHOLDER,
  cotton:   PLACEHOLDER,
  gauze:    PLACEHOLDER,
  thermo:   PLACEHOLDER,
  bibs:     PLACEHOLDER,
  tape:     PLACEHOLDER,
};

const COMMON_RELATED: RelatedProduct[] = [
  { id: 4,  slug: "nitrile-industrial-green-xl-v2", brand: "MEDCHAIN", name: "8 Mil Nitrile Industrial Gloves, Diamond Textured, Green, XL (8104)", price: 41.78, image: IMG.related1 },
  { id: 2,  slug: "accusouch-latex-lg-case",         brand: "MEDCHAIN", name: "AccuTouch Latex Exam Gloves, Large, Powder Free, Case (6624)",          price: 41.78, image: IMG.related2 },
  { id: 10, slug: "accusouch-latex-pf-xl",           brand: "MEDCHAIN", name: "AccuTouch Latex Exam Gloves, XL, Powder Free, Case (6624)",             price: 41.78, image: IMG.related3 },
  { id: 6,  slug: "nitrile-industrial-xl-v3",        brand: "MEDCHAIN", name: "8 Mil Nitrile Industrial Gloves, Diamond Textured, Green, XL (8104)",   price: 41.78, image: IMG.related4 },
];

const COMMON_ACCESSORIES: AccessoryProduct[] = [
  { id: 101, name: "Saline Solution",      price: 5.25,  image: IMG.saline  },
  { id: 102, name: "Cotton Applicator",    price: 2.20,  image: IMG.cotton  },
  { id: 103, name: "Gauze Pads",           price: 41.78, image: IMG.gauze   },
  { id: 104, name: "Digital Thermometer",  price: 22.12, image: IMG.thermo  },
  { id: 105, name: "Patient Bibs",         price: 2.22,  image: IMG.bibs    },
  { id: 106, name: "Medical Tape",         price: 3.10,  image: IMG.tape    },
];

export const PRODUCTS_DETAIL: ProductDetailData[] = [
  {
    id: 1,
    slug: "nitrile-gloves-green-xl",
    brand: "BD",
    sku: "BD-55085N-M-100",
    name: "BD Nitrile Exam Gloves PF Medium",
    rating: 4.8,
    reviewCount: 127,
    inStock: true,
    freeShipping: true,
    images: [IMG.main, IMG.thumb1, IMG.thumb2, IMG.thumb3, IMG.thumb4, IMG.thumb5],
    units: [
      { label: "Each",       qtyLabel: "10 Nitrile",  price: 0.99,   priceLabel: "$0.99/ea"   },
      { label: "Box (100)",  qtyLabel: "100 Nitrile", price: 24.99,  priceLabel: "$24.99/bx"  },
      { label: "Case (1000)", qtyLabel: "Bulk Pricing", price: 124.99, priceLabel: "$124.99/cs" },
    ],
    strikePrice: 27.99,
    savePct: 11,
    saleLabel: "Limited time sale",
    description:
      "BD Nitrile Exam Gloves are powder-free, disposable examination gloves manufactured from premium-grade nitrile for superior chemical resistance and tactile sensitivity. Designed for use in clinical examination, patient care, and procedural settings.",
    keyFeatures: [
      "Powder-free formulation — reduces risk of allergic reactions and contamination",
      "3.5 mil thickness for reliable barrier protection without sacrificing tactile sensitivity",
      "Textured fingertips for enhanced grip on instruments and materials",
      "Ambidextrous design fits either hand for rapid donning",
      "AQL 1.5 per ASTM D6319 standard for examination gloves",
      "Beaded cuff for easy donning; reduces risk of rolling",
    ],
    specifications: [
      { label: "Material",        value: "Nitrile"             },
      { label: "Thickness",       value: "3.5 mil"             },
      { label: "Powder",          value: "Powder-Free"         },
      { label: "Sterility",       value: "Non-Sterile"         },
      { label: "AQL",             value: "1.5"                 },
      { label: "Standard",        value: "ASTM D6319"          },
      { label: "Cuff Style",      value: "Beaded"              },
      { label: "Glove Style",     value: "Ambidextrous"        },
      { label: "Fingertip",       value: "Textured"            },
      { label: "Color",           value: "Blue"                },
      { label: "Box Quantity",    value: "100 gloves"          },
      { label: "Case Quantity",   value: "1000 gloves (10 bx)" },
    ],
    orderingInfo:
      "Orders placed before 3 PM EST ship same day. Standard delivery is 2–3 business days. Bulk orders of 10+ cases qualify for additional volume discounts. Contact your account manager or use the B2B quote form for custom pricing.",
    commonlyPurchasedWith: COMMON_RELATED,
    youMayAlsoNeed: COMMON_ACCESSORIES,
  },
];

// Fallback detail for products without full data
function makeFallback(slug: string): ProductDetailData {
  return {
    id: 99,
    slug,
    brand: "MEDCHAIN",
    sku: "MC-DEFAULT-001",
    name: "Medical Supply Product",
    rating: 4.5,
    reviewCount: 48,
    inStock: true,
    freeShipping: false,
    images: [IMG.related1, IMG.thumb2, IMG.thumb3],
    units: [
      { label: "Each",      qtyLabel: "Single",      price: 9.99,  priceLabel: "$9.99/ea"   },
      { label: "Box (50)",  qtyLabel: "50 units",    price: 41.78, priceLabel: "$41.78/bx"  },
      { label: "Case (500)", qtyLabel: "Bulk",       price: 379.00, priceLabel: "$379.00/cs" },
    ],
    description:
      "Professional-grade medical supply manufactured to the highest quality standards. Suitable for clinical examination, patient care, and procedural settings.",
    keyFeatures: [
      "Premium materials for reliable barrier protection",
      "Designed for healthcare professional use",
      "Meets industry quality standards",
    ],
    specifications: [
      { label: "Material", value: "Medical Grade" },
      { label: "Sterility", value: "Non-Sterile" },
    ],
    orderingInfo: "Same-day shipping on orders placed before 3 PM EST.",
    commonlyPurchasedWith: COMMON_RELATED,
    youMayAlsoNeed: COMMON_ACCESSORIES,
  };
}

export function getProductBySlug(slug: string): ProductDetailData {
  return PRODUCTS_DETAIL.find(p => p.slug === slug) ?? makeFallback(slug);
}
