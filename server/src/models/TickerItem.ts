import mongoose, { Schema, model } from "mongoose";

export interface ITickerItem {
  _id: mongoose.Types.ObjectId;
  text: string;
  deletedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const tickerItemSchema = new Schema<ITickerItem>(
  {
    text: { type: String, required: true, trim: true },
    deletedAt: { type: Date, default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const TickerItem =
  mongoose.models.TickerItem ??
  model<ITickerItem>("TickerItem", tickerItemSchema);
