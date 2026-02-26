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
  user?: mongoose.Types.ObjectId;
  lineItems: IOrderLineItem[];
  shippingAddress: IShippingAddress;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paypalOrderId?: string;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<IOrderLineItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
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
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    lineItems: [lineItemSchema],
    shippingAddress: { type: shippingAddressSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },
    stripeCheckoutSessionId: { type: String },
    paypalOrderId: { type: String },
    trackingNumber: { type: String },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.models.Order ?? model<IOrder>("Order", orderSchema);
