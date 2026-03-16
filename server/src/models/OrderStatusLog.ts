import mongoose, { Schema, model } from "mongoose";

export type OrderStatusValue =
  | "pending"
  | "processing"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderStatusChangeReason =
  | "admin_change"
  | "admin_refund"
  | "stripe_payment_received"
  | "stripe_refund"
  | "payment_verified"
  | "shipping_label_created"
  | "system";

export interface IOrderStatusLog {
  _id: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  statusBefore: OrderStatusValue;
  statusAfter: OrderStatusValue;
  reason: OrderStatusChangeReason;
  notes?: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderStatusLogSchema = new Schema<IOrderStatusLog>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    statusBefore: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      required: true,
    },
    statusAfter: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "admin_change",
        "admin_refund",
        "stripe_payment_received",
        "stripe_refund",
        "payment_verified",
        "shipping_label_created",
        "system",
      ],
      required: true,
    },
    notes: { type: String, default: "" },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

orderStatusLogSchema.index({ order: 1, createdAt: 1 });
orderStatusLogSchema.index({ createdAt: -1 });

export const OrderStatusLog =
  mongoose.models.OrderStatusLog ??
  model<IOrderStatusLog>("OrderStatusLog", orderStatusLogSchema);
