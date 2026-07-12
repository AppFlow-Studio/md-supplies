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
  estimatedRestockDate: string | null;
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
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  images: { nodes: ProductImage[] };
  variants: { nodes: Pick<ProductVariant, 'id' | 'title' | 'price' | 'compareAtPrice' | 'availableForSale' | 'quantityAvailable'>[] };
};

export type CollectionFilter = {
  id: string;
  label: string;
  type: string;
  values: { id: string; label: string; count: number; input: string }[];
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
    selectedOptions: SelectedOption[];
    product: {
      id: string;
      title: string;
      handle: string;
      images: { nodes: ProductImage[] };
    };
  };
  cost: { totalAmount: Money };
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
