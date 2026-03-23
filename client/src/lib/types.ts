export interface UserInfo {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  deletedAt?: string | null;
}

/** Excludes the Uncategorized placeholder from display (no products should use it). */
export function filterDisplayCategories(categories: Category[]): Category[] {
  return categories.filter(
    (c) =>
      c.name?.toLowerCase() !== "uncategorized" &&
      c.slug?.toLowerCase() !== "uncategorized",
  );
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
  performedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

export interface OrderProduct {
  _id: string;
  name: string;
  slug: string;
  images: string[];
}

export interface OrderLineItem {
  product: OrderProduct;
  quantity: number;
  price: number; // cents
}

export interface OrderConfirmation {
  _id: string;
  orderNumber?: string;
  lineItems: OrderLineItem[];
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: string;
  taxAmount?: number;
  shippingAmount?: number;
  pointsApplied?: number;
  pointsDiscountCents?: number;
  discountCode?: string;
  discountAmountCents?: number;
  discountType?: "product" | "shipping";
  createdAt: string;
}

export interface Discount {
  _id: string;
  code: string;
  description: string;
  discountType: "product" | "shipping";
  valueType: "percentage" | "fixed";
  valueCents: number;
  valuePercent: number;
  maxDiscountCents: number;
  minOrderCents: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  usedCount: number;
  startDate?: string;
  expiresAt?: string;
  isActive: boolean;
  firstOrderOnly: boolean;
  applicableProducts: { _id: string; name: string; slug: string }[];
  usageLog: {
    userId?: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    cookieId?: string;
    orderId: { _id: string; createdAt: string } | string;
    usedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
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
  changedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

// ─── Admin Orders ───────────────────────────────────────────────────────────

export interface AdminOrderUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface AdminOrderLineItem {
  product: {
    _id: string;
    name: string;
    slug: string;
    images: string[];
    price?: number;
  };
  quantity: number;
  price: number; // cents
}

export interface AdminOrderStatusHistoryEntry {
  _id: string;
  statusBefore: string;
  statusAfter: string;
  reason: string;
  notes?: string;
  performedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder {
  _id: string;
  orderNumber?: string;
  user?: AdminOrderUser | null;
  email?: string;
  cartSessionId?: string;
  lineItems: AdminOrderLineItem[];
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: string;
  paymentStatus?: string;
  taxAmount?: number;
  shippingAmount?: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paypalOrderId?: string;
  trackingNumber?: string;
  pointsApplied?: number;
  pointsDiscountCents?: number;
  discountCode?: string;
  discountAmountCents?: number;
  discountType?: "product" | "shipping";
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  statusHistory?: AdminOrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderCounts {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  counts: AdminOrderCounts;
  revenue: number;
}

export interface AdminOrderDetailResponse {
  order: AdminOrder;
}

// ─── Admin Users ────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
  pointsBalance: number;
  lastVisit?: string;
  createdAt: string;
}

export interface AdminUserRoleCounts {
  total: number;
  customer: number;
  admin: number;
  guest: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  counts: AdminUserRoleCounts;
}

export interface AdminUserDetail {
  _id: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
  pointsBalance: number;
  visitCount?: number;
  lastVisit?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetailResponse {
  user: AdminUserDetail;
  orders: AdminOrder[];
  totalOrders: number;
  totalSpent: number;
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: "customer" | "admin";
}

export interface CreateUserResponse {
  user: AdminUser;
  emailSent: boolean;
}
