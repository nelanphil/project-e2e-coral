import mongoose, { Schema, model } from "mongoose";

export interface IInventory {
  _id: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Inventory =
  mongoose.models.Inventory ?? model<IInventory>("Inventory", inventorySchema);
