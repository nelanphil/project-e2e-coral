import mongoose, { Schema, model } from "mongoose";

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  sku?: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  cost: number;
  category: mongoose.Types.ObjectId;
  collections?: mongoose.Types.ObjectId[];
  attributes?: Record<string, string>;
  whyChoose?: string;
  keyFeatures?: string;
  colorVariation?: string;
  growthHabit?: string;
  optimalCare?: string;
  idealCompatibility?: string;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, default: null },
    description: { type: String, default: "" },
    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
    images: [{ type: String }],
    price: { type: Number, required: true },
    compareAtPrice: { type: Number, default: null },
    cost: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    collections: [
      { type: Schema.Types.ObjectId, ref: "Collection", default: [] },
    ],
    attributes: { type: Schema.Types.Mixed },
    whyChoose: { type: String, default: null },
    keyFeatures: { type: String, default: null },
    colorVariation: { type: String, default: null },
    growthHabit: { type: String, default: null },
    optimalCare: { type: String, default: null },
    idealCompatibility: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1 });
productSchema.index({ deletedAt: 1 });
productSchema.index({ category: 1 });
productSchema.index({ collections: 1 });
productSchema.index({ name: "text", description: "text" });

export const Product =
  mongoose.models.Product ?? model<IProduct>("Product", productSchema);
