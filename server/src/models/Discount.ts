import mongoose, { Schema, model } from "mongoose";

export interface IDiscountUsageEntry {
  userId?: mongoose.Types.ObjectId;
  cookieId?: string;
  orderId: mongoose.Types.ObjectId;
  usedAt: Date;
}

export interface IDiscount {
  _id: mongoose.Types.ObjectId;
  /** Unique code — stored uppercase */
  code: string;
  /** Internal description for admin reference */
  description: string;
  /** Whether the discount applies to products or shipping */
  discountType: "product" | "shipping";
  /** Whether the value is a percentage off or a fixed cents amount */
  valueType: "percentage" | "fixed";
  /** Fixed discount amount in cents (used when valueType = "fixed") */
  valueCents: number;
  /** Percentage discount 0-100 (used when valueType = "percentage") */
  valuePercent: number;
  /** Optional cap in cents for percentage discounts (0 = no cap) */
  maxDiscountCents: number;
  /** Minimum order subtotal in cents to qualify (0 = no minimum) */
  minOrderCents: number;
  /** Maximum total uses across all users (0 = unlimited) */
  maxUsesTotal: number;
  /** Maximum uses per individual user (0 = unlimited) */
  maxUsesPerUser: number;
  /** How many times the code has been redeemed */
  usedCount: number;
  /** Optional start date — code is invalid before this */
  startDate?: Date;
  /** Optional expiry date — code is invalid after this */
  expiresAt?: Date;
  /** Soft-delete / toggle */
  isActive: boolean;
  /** Only valid for customers who haven't placed an order before */
  firstOrderOnly: boolean;
  /** If non-empty, code applies only to these products (product-type only) */
  applicableProducts: mongoose.Types.ObjectId[];
  /** Detailed usage log for per-user tracking */
  usageLog: IDiscountUsageEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const discountUsageEntrySchema = new Schema<IDiscountUsageEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    cookieId: { type: String },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    usedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const discountSchema = new Schema<IDiscount>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, default: "" },
    discountType: {
      type: String,
      enum: ["product", "shipping"],
      required: true,
    },
    valueType: { type: String, enum: ["percentage", "fixed"], required: true },
    valueCents: { type: Number, default: 0 },
    valuePercent: { type: Number, default: 0 },
    maxDiscountCents: { type: Number, default: 0 },
    minOrderCents: { type: Number, default: 0 },
    maxUsesTotal: { type: Number, default: 0 },
    maxUsesPerUser: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    startDate: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    firstOrderOnly: { type: Boolean, default: false },
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    usageLog: [discountUsageEntrySchema],
  },
  { timestamps: true },
);

discountSchema.index({ code: 1 });
discountSchema.index({ isActive: 1, expiresAt: 1 });

export const Discount =
  mongoose.models.Discount ?? model<IDiscount>("Discount", discountSchema);
