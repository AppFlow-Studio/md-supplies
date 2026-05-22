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
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice: Money | null;
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
  metafields?: Array<{ key: string; value: string; namespace: string }>;
};

export type CollectionProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  availableForSale: boolean;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  images: { nodes: ProductImage[] };
  variants: { nodes: Pick<ProductVariant, 'id' | 'price' | 'compareAtPrice' | 'availableForSale'>[] };
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
  products: {
    nodes: CollectionProduct[];
    pageInfo: PageInfo;
    filters?: CollectionFilter[];
  };
};

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
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
