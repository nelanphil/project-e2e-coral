import mongoose, { Schema, model } from "mongoose";

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  user?: mongoose.Types.ObjectId;
  items: ICartItem[];
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    sessionId: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    items: [cartItemSchema],
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

cartSchema.index({ sessionId: 1 }, { unique: true });
cartSchema.index({ user: 1 });

export const Cart = mongoose.models.Cart ?? model<ICart>("Cart", cartSchema);
