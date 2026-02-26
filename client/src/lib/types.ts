export interface UserInfo {
  _id: string;
  email: string;
  name: string;
  role: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  sku?: string | null;
  description: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  images: string[];
  price: number;
  compareAtPrice?: number | null;
  cost: number;
  category: Category | string;
  collections?: Collection[] | string[];
  isActive?: boolean;
  deletedAt?: string | null;
  inventory?: { quantity: number };
  attributes?: Record<string, string>;
  whyChoose?: string | null;
  keyFeatures?: string | null;
  colorVariation?: string | null;
  growthHabit?: string | null;
  optimalCare?: string | null;
  idealCompatibility?: string | null;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description: string;
  carouselDescription?: string;
  showInCarousel?: boolean;
  tags?: string[];
  products?: Product[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionsResponse {
  collections: Collection[];
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image?: string | null;
}

export interface CartResponse {
  items: CartItem[];
  sessionId: string | null;
}

export interface InventoryLog {
  _id: string;
  product: string;
  quantityBefore: number;
  quantityAfter: number;
  change: number;
  reason: "manual" | "sale" | "restock" | "adjustment";
  notes?: string;
  performedBy?: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface PriceLog {
  _id: string;
  product: string;
  field: "price" | "compareAtPrice" | "cost";
  valueBefore: number;
  valueAfter: number;
  reason?:
    | "promotion"
    | "cost_change"
    | "market_adjustment"
    | "correction"
    | "other";
  notes?: string;
  changedBy?: { _id: string; name: string; email: string };
  createdAt: string;
}
