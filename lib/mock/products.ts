import type { Product } from '@/types/product'

const nitrileGloves: Product = {
  title: 'Nitrile Exam Gloves, Powder-Free',
  handle: 'nitrile-exam-gloves-powder-free',
  images: [
    {
      url: 'https://placehold.co/800x800/e5eff7/0086b1?text=Nitrile+Gloves',
      altText: 'Nitrile Exam Gloves box, powder-free, blue',
      width: 800,
      height: 800,
    },
    {
      url: 'https://placehold.co/800x800/dbeafe/1d4ed8?text=Gloves+Detail',
      altText: 'Close-up of nitrile glove fingertip texture',
      width: 800,
      height: 800,
    },
    {
      url: 'https://placehold.co/800x800/f0fdf4/166534?text=Box+Contents',
      altText: 'Box open showing 100-count gloves inside',
      width: 800,
      height: 800,
    },
  ],
  imageAltText: 'Nitrile Exam Gloves, Powder-Free — 100 count box',

  brand: 'Dawn Mist',
  vendor: 'Dukal',
  partnerVendor: 'Graham Field',

  sku: 'DUK-NEG-BLU-M',
  price: 2499,
  compareAtPrice: 2999,

  options: [
    { name: 'Size', values: ['Small', 'Medium', 'Large', 'X-Large'] },
    { name: 'Color', values: ['Blue', 'Purple', 'White'] },
  ],

  variants: [
    {
      id: 'v-sm-blu',
      title: 'Small / Blue',
      sku: 'DUK-NEG-BLU-S',
      price: 2499,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Small' }, { name: 'Color', value: 'Blue' }],
    },
    {
      id: 'v-md-blu',
      title: 'Medium / Blue',
      sku: 'DUK-NEG-BLU-M',
      price: 2499,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Medium' }, { name: 'Color', value: 'Blue' }],
    },
    {
      id: 'v-lg-blu',
      title: 'Large / Blue',
      sku: 'DUK-NEG-BLU-L',
      price: 2499,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Large' }, { name: 'Color', value: 'Blue' }],
    },
    {
      id: 'v-xl-blu',
      title: 'X-Large / Blue',
      sku: 'DUK-NEG-BLU-XL',
      price: 2599,
      available: false,
      selectedOptions: [{ name: 'Size', value: 'X-Large' }, { name: 'Color', value: 'Blue' }],
    },
    {
      id: 'v-sm-pur',
      title: 'Small / Purple',
      sku: 'DUK-NEG-PUR-S',
      price: 2599,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Small' }, { name: 'Color', value: 'Purple' }],
    },
    {
      id: 'v-md-pur',
      title: 'Medium / Purple',
      sku: 'DUK-NEG-PUR-M',
      price: 2599,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Medium' }, { name: 'Color', value: 'Purple' }],
    },
    {
      id: 'v-lg-pur',
      title: 'Large / Purple',
      sku: 'DUK-NEG-PUR-L',
      price: 2599,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Large' }, { name: 'Color', value: 'Purple' }],
    },
    {
      id: 'v-xl-pur',
      title: 'X-Large / Purple',
      sku: 'DUK-NEG-PUR-XL',
      price: 2699,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'X-Large' }, { name: 'Color', value: 'Purple' }],
    },
    {
      id: 'v-sm-wht',
      title: 'Small / White',
      sku: 'DUK-NEG-WHT-S',
      price: 2399,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Small' }, { name: 'Color', value: 'White' }],
    },
    {
      id: 'v-md-wht',
      title: 'Medium / White',
      sku: 'DUK-NEG-WHT-M',
      price: 2399,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'Medium' }, { name: 'Color', value: 'White' }],
    },
    {
      id: 'v-lg-wht',
      title: 'Large / White',
      sku: 'DUK-NEG-WHT-L',
      price: 2399,
      available: false,
      selectedOptions: [{ name: 'Size', value: 'Large' }, { name: 'Color', value: 'White' }],
    },
    {
      id: 'v-xl-wht',
      title: 'X-Large / White',
      sku: 'DUK-NEG-WHT-XL',
      price: 2499,
      available: true,
      selectedOptions: [{ name: 'Size', value: 'X-Large' }, { name: 'Color', value: 'White' }],
    },
  ],

  description: `
    <p>Dawn Mist Nitrile Exam Gloves provide excellent chemical resistance and durability for clinical and medical examination environments. Powder-free formulation eliminates latex-related allergy risks, making these gloves safe for patients with latex sensitivities.</p>
    <p>Fingertip texture enhances grip and tactile sensitivity during procedures. Beaded cuff prevents rollback during donning and doffing. Ambidextrous design fits either hand for fast, efficient glove access.</p>
    <p>Manufactured to ASTM D6319-19 standards. FDA registered for use in medical examinations and diagnostic procedures.</p>
  `,

  specifications: [
    { label: 'Material', value: 'Nitrile' },
    { label: 'Sterility', value: 'Non-sterile' },
    { label: 'Powder', value: 'Powder-free' },
    { label: 'Texture', value: 'Fingertip textured' },
    { label: 'AQL Level', value: '1.5' },
    { label: 'Thickness', value: '3.5 mil' },
    { label: 'Standard', value: 'ASTM D6319-19' },
    { label: 'FDA', value: '510(k) registered' },
    { label: 'Cuff', value: 'Beaded' },
    { label: 'Fit', value: 'Ambidextrous' },
  ],

  unitsPerBox: 100,
  boxesPerCase: 10,
  totalUnits: 1000,
  sellingUnit: 'Box',
  unitPriceEach: 25,
  unitPriceBox: 2499,
  unitPriceCase: 22491,

  shippingMessage: 'In-stock items ship within 1–2 business days.',
  leadTime: '1–2 business days',
  returnPolicySummary:
    'Unopened boxes in original packaging may be returned within 30 days of delivery for a full refund. Opened boxes are not eligible for return due to infection-control requirements. Contact your account representative to initiate a return.',

  relatedProducts: [
    {
      handle: 'latex-exam-gloves-powder-free',
      title: 'Latex Exam Gloves, Powder-Free',
      image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Latex+Gloves',
      price: 1999,
    },
    {
      handle: 'vinyl-exam-gloves-clear',
      title: 'Vinyl Exam Gloves, Clear',
      image: 'https://placehold.co/400x400/f0fdf4/166534?text=Vinyl+Gloves',
      price: 1699,
    },
    {
      handle: 'nitrile-surgical-gloves-sterile',
      title: 'Nitrile Surgical Gloves, Sterile',
      image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Surgical+Gloves',
      price: 5999,
    },
    {
      handle: 'disposable-glove-liners',
      title: 'Disposable Glove Liners',
      image: 'https://placehold.co/400x400/fce7f3/9d174d?text=Glove+Liners',
      price: 899,
    },
  ],

  relatedCollections: [
    { handle: 'exam-gloves', title: 'Exam Gloves' },
    { handle: 'protective-equipment', title: 'Protective Equipment' },
    { handle: 'infection-control', title: 'Infection Control' },
    { handle: 'disposable-supplies', title: 'Disposable Supplies' },
  ],

  breadcrumbs: [
    { title: 'Home', handle: '/' },
    { title: 'Protective Equipment', handle: '/category/protective-equipment' },
    { title: 'Exam Gloves', handle: '/category/exam-gloves' },
  ],

  seoTitle: 'Nitrile Exam Gloves, Powder-Free — Dawn Mist by Dukal | MDSupplies',
  seoDescription:
    'Buy Dawn Mist Nitrile Exam Gloves (powder-free, 100/box) in Small, Medium, Large, and X-Large. ASTM D6319-19 compliant, 3.5 mil thickness, beaded cuff. Ships within 1–2 business days.',
}

const mockProductMap: Record<string, Product> = {
  [nitrileGloves.handle]: nitrileGloves,
}

export function getMockProduct(handle: string): Product | null {
  return mockProductMap[handle] ?? null
}

export function getMockProductOrDefault(): Product {
  return nitrileGloves
}
