import mongoose, { Schema, model } from "mongoose";

export interface IOrderLineItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

export interface IShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  orderNumber?: string;
  user?: mongoose.Types.ObjectId;
  email?: string;
  cartSessionId?: string;
  lineItems: IOrderLineItem[];
  shippingAddress: IShippingAddress;
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  paymentStatus?: "unpaid" | "paid" | "refunded";
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
  acceptLanguage?: string;
  cookieId?: string;
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<IOrderLineItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true, sparse: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String },
    cartSessionId: { type: String },
    lineItems: [lineItemSchema],
    shippingAddress: { type: shippingAddressSchema, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    taxAmount: { type: Number },
    shippingAmount: { type: Number },
    stripePaymentIntentId: { type: String },
    stripeCheckoutSessionId: { type: String },
    paypalOrderId: { type: String },
    trackingNumber: { type: String },
    pointsApplied: { type: Number },
    pointsDiscountCents: { type: Number },
    discountCode: { type: String },
    discountAmountCents: { type: Number },
    discountType: { type: String, enum: ["product", "shipping"] },
    ipAddress: { type: String },
    userAgent: { type: String },
    referer: { type: String },
    acceptLanguage: { type: String },
    cookieId: { type: String },
    geoCountry: { type: String },
    geoRegion: { type: String },
    geoCity: { type: String },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ cartSessionId: 1, status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ email: 1 });
orderSchema.index({ stripePaymentIntentId: 1 });

export const Order =
  mongoose.models.Order ?? model<IOrder>("Order", orderSchema);
