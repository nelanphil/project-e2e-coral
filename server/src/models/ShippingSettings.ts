import mongoose, { Schema, model } from "mongoose";

export interface IShippingSettings {
  _id: mongoose.Types.ObjectId;
  /** Shipping amount in cents for Florida addresses */
  shippingAmountFlorida: number;
  /** Shipping amount in cents for all other states */
  shippingAmountOther: number;
  /** Subtotal threshold in cents for free shipping (0 = disabled) */
  freeShippingThresholdCents: number;
  updatedAt: Date;
}

const shippingSettingsSchema = new Schema<IShippingSettings>(
  {
    shippingAmountFlorida: { type: Number, default: 0 },
    shippingAmountOther: { type: Number, default: 0 },
    freeShippingThresholdCents: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const ShippingSettings =
  mongoose.models.ShippingSettings ??
  model<IShippingSettings>("ShippingSettings", shippingSettingsSchema);
