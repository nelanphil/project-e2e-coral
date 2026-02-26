import mongoose, { Schema, model } from "mongoose";

export interface IInventoryLog {
  _id: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantityBefore: number;
  quantityAfter: number;
  change: number;
  reason: "manual" | "sale" | "restock" | "adjustment";
  notes?: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    change: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["manual", "sale", "restock", "adjustment"],
      required: true,
    },
    notes: { type: String, default: "" },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

inventoryLogSchema.index({ product: 1, createdAt: -1 });

export const InventoryLog =
  mongoose.models.InventoryLog ??
  model<IInventoryLog>("InventoryLog", inventoryLogSchema);
