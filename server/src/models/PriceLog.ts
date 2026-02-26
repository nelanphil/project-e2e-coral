import mongoose, { Schema, model } from "mongoose";

export interface IPriceLog {
  _id: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  field: "price" | "compareAtPrice" | "cost";
  valueBefore: number;
  valueAfter: number;
  reason:
    | "promotion"
    | "cost_change"
    | "market_adjustment"
    | "correction"
    | "other";
  notes?: string;
  changedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const priceLogSchema = new Schema<IPriceLog>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    field: {
      type: String,
      enum: ["price", "compareAtPrice", "cost"],
      required: true,
    },
    valueBefore: { type: Number, required: true },
    valueAfter: { type: Number, required: true },
    reason: {
      type: String,
      enum: [
        "promotion",
        "cost_change",
        "market_adjustment",
        "correction",
        "other",
      ],
      default: "correction",
    },
    notes: { type: String, default: "" },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

priceLogSchema.index({ product: 1, createdAt: -1 });

export const PriceLog =
  mongoose.models.PriceLog ?? model<IPriceLog>("PriceLog", priceLogSchema);
