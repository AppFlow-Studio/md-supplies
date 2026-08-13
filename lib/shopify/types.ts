import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

export type ShopifyError = {
  message: string;
  locations?: { line: number; column: number }[];
  extensions?: Record<string, unknown>;
};

export type ShopifyResponse<T> = {
  data: T;
  errors?: ShopifyError[];
};

export type Money = {
  amount: string;
  currencyCode: string;
};

export type Seo = {
  title: string | null;
  description: string | null;
};

export type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
};

export type SelectedOption = {
  name: string;
  value: string;
};

export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type ProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  /** Shopify barcode field; often junk (SKU copies) — see lib/gtin.ts. */
  barcode?: string | null;
  availableForSale: boolean;
  quantityAvailable: number | null;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice: Money | null;
};

export type ProductMetafields = {
  brandName: string | null;
  unitsPerOrder: string | null;
  quantityOfUnits: string | null;
  orderSize: string | null;
  material: string | null;
  use: string | null;
  features: string | null;
  color: string | null;
  sterility: string | null;
  thickness: string | null;
  gloveSize: string | null;
  needleGauge: string | null;
  needleLength: string | null;
  sizeLength: string | null;
  /** `custom.estimated_back_order_restock_date`. DEV-SHIP-04: queried and
      normalized for compatibility/live-theme use only — the custom storefront
      never displays, announces, or infers Backorder status from this. */
  estimatedRestockDate: string | null;
  /** `custom.backorder_restock_eta`. Same compatibility-only status as
      estimatedRestockDate above — never displayed by the custom storefront. */
  backorderRestockEta: string | null;
  /** Raw `custom.backorder`; the SOLE gate for the backorder label (DEV-SHIP-04
      final business rule — neither ETA field above ever affects this). */
  backorder?: { value: string } | null;
  /** Raw `custom.is_rx_only`; union'd with the RX tag by lib/rx-gate.ts. */
  isRxOnly?: { value: string } | null;
  /**
   * Raw `custom.free_shipping`. Merchant-controlled gate for the Free
   * Shipping badge, ANDed with the shipping resolver's own confirmation
   * (public_display_class=standard-free + effective_rate_class=FREE) by
   * lib/shipping-resolver/free-shipping-gate.ts. Never exposed past that
   * gate — like effective_rate_class, it is read only to narrow the claim
   * and must never itself appear in the ShippingDisplay type components render.
   */
  freeShipping?: { value: string } | null;
  testsFor: string | null;
  detectableDrugs: string | null;
  adulterants: string | null;
  otherFeatures: string | null;
  typeList: string | null;
  customBadge1: string | null;
  customBadge2: string | null;
  customBadge3: string | null;
};

export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  availableForSale: boolean;
  tags: string[];
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  images: { nodes: ProductImage[] };
  variants: { nodes: ProductVariant[] };
  options: ProductOption[];
  seo: Seo;
  /** Collections this product belongs to — used to pick the primary category
      for the /product/ breadcrumb (audit L12). */
  collections: { nodes: { handle: string; title: string }[] };
} & ProductMetafields;

export type CollectionProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  availableForSale: boolean;
  tags: string[];
  /** Raw `custom.brand_name`. The ONLY approved public brand source —
      resolve via lib/brand.ts, never fall back to `vendor`. */
  brandName?: { value: string } | null;
  /** Raw `custom.estimated_back_order_restock_date`. DEV-SHIP-04: compatibility/
      live-theme use only — never displayed, announced, or inferred from by the
      custom storefront. May be absent on queries that don't request it. */
  estimatedRestockDate?: { value: string } | null;
  /** Raw `custom.backorder_restock_eta`. Same compatibility-only status as
      estimatedRestockDate above — never displayed by the custom storefront. */
  backorderRestockEta?: { value: string } | null;
  /** Raw `custom.backorder`; the SOLE gate for the backorder label (DEV-SHIP-04
      final business rule — neither ETA field above ever affects this). */
  backorder?: { value: string } | null;
  /** Raw `custom.is_rx_only`. Union'd with the RX tag by lib/rx-gate.ts so a
      grid card's RX badge matches the PDP and the checkout gate. Optional:
      queries that don't select it degrade to tag-only detection. */
  isRxOnly?: { value: string } | null;
  /** Raw `custom.free_shipping`. Consumed ONLY by attachCardShippingDisplay
      to gate `shippingDisplay` below before it reaches this object — never
      read by any component. See ProductMetafields.freeShipping. */
  freeShipping?: { value: string } | null;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  images: { nodes: ProductImage[] };
  variants: { nodes: Pick<ProductVariant, 'id' | 'title' | 'price' | 'compareAtPrice' | 'availableForSale' | 'quantityAvailable'>[] };
  shippingDisplay?: ShippingDisplay | null;
};

export type CollectionFilterValue = {
  id: string;
  label: string;
  count: number;
  input: string;
};

export type CollectionFilter = {
  id: string;
  label: string;
  type: string;
  values: CollectionFilterValue[];
};

export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

export type Collection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  image: ProductImage | null;
  seo: Seo;
  products: {
    nodes: CollectionProduct[];
    pageInfo: PageInfo;
    filters?: CollectionFilter[];
  };
};

export type CollectionHero = Pick<Collection, 'id' | 'title' | 'handle' | 'description' | 'descriptionHtml' | 'image' | 'seo'>;

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    sku: string | null;
    /** The variant's own unit price -- distinct from `cost.totalAmount`
     * below, which a no-rate-for-destination line zeroes out while this
     * stays positive. See lib/shopify/cart-lines.ts. */
    price: Money;
    selectedOptions: SelectedOption[];
    product: {
      id: string;
      title: string;
      handle: string;
      vendor: string;
      tags: string[];
      /** `custom.is_rx_only` — second RX signal, union'd with the tag. */
      isRxOnly?: { value: string } | null;
      /** `custom.estimated_back_order_restock_date`. DEV-SHIP-04: compatibility/
          live-theme use only — never displayed by the custom storefront. */
      estimatedRestockDate?: { value: string } | null;
      /** `custom.backorder_restock_eta`. Same compatibility-only status. */
      backorderRestockEta?: { value: string } | null;
      /** Raw `custom.backorder`; the SOLE gate for the backorder label. */
      backorder?: { value: string } | null;
      /** Raw `custom.free_shipping`. Consumed only by attachCartShippingDisplay
          to gate `shippingDisplay` below before it reaches this line. */
      freeShipping?: { value: string } | null;
      images: { nodes: ProductImage[] };
    };
  };
  cost: { totalAmount: Money };
  shippingDisplay?: ShippingDisplay | null;
};

export type CartCost = {
  subtotalAmount: Money;
  totalAmount: Money;
  totalTaxAmount: Money | null;
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  attributes: { key: string; value: string }[];
  buyerIdentity: { customer: { id: string } | null } | null;
  lines: { nodes: CartLine[] };
  cost: CartCost;
};

export type Address = {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  country: string;
  zip: string;
  phoneNumber: string | null;
};

export type OrderLineItem = {
  title: string;
  quantity: number;
  originalTotalPrice?: Money;
  variant: {
    id: string;
    title: string;
    price: Money;
    selectedOptions?: SelectedOption[];
    image: ProductImage | null;
  } | null;
};

export type Fulfillment = {
  trackingCompany: string | null;
  trackingInfo: { number: string; url: string }[];
};

export type Order = {
  id: string;
  number: number;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: Money;
  subtotalPrice?: Money;
  totalShippingPrice?: Money;
  totalTax?: Money;
  shippingAddress?: Address;
  lineItems: { nodes: OrderLineItem[] };
  fulfillments: Fulfillment[];
};

export type MarketCurrency = {
  isoCode: string;
  symbol: string;
};

export type AvailableCountry = {
  isoCode: string;
  name: string;
  currency: MarketCurrency;
};

export type LocalizationData = {
  country: AvailableCountry;
  availableCountries: AvailableCountry[];
};

export type BlogArticleSummary = {
  id: string;
  handle: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  author: { name: string };
  image: ProductImage | null;
  tags: string[];
};

export type BlogArticle = BlogArticleSummary & {
  contentHtml: string;
  tags: string[];
  seo: Seo | null;
};

export type ShopifyBlog = {
  handle: string;
  title: string;
  articles: { nodes: BlogArticleSummary[] };
};

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: { emailAddress: string } | null;
  phoneNumber: { phoneNumber: string } | null;
  defaultAddress: Address | null;
  addresses?: { nodes: Address[] };
  orders?: { nodes: Order[]; pageInfo: PageInfo };
};

export type SlimCollection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  updatedAt: string;
  image: ProductImage | null;
  seo: {
    title: string | null;
    description: string | null;
  };
};

export type MenuItemLeaf = { id: string; title: string; url: string };
export type MenuSubItem = MenuItemLeaf & { type?: string; items: MenuItemLeaf[] };
export type MenuItem = MenuSubItem & { type: string; tags: string[]; items: MenuSubItem[] };
export type ShopifyMenu = { id: string; title: string; items: MenuItem[] };
