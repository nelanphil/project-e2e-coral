import mongoose, { Schema, model } from "mongoose";

export interface ICollection {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  carouselDescription?: string;
  showInCarousel?: boolean;
  tags: string[];
  products: mongoose.Types.ObjectId[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    carouselDescription: { type: String, default: "" },
    showInCarousel: { type: Boolean, default: false },
    tags: [{ type: String, default: [] }],
    products: [{ type: Schema.Types.ObjectId, ref: "Product", default: [] }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// slug index is created by unique: true on the field
collectionSchema.index({ deletedAt: 1 });
collectionSchema.index({ products: 1 });
collectionSchema.index({ tags: 1 });

export const Collection =
  mongoose.models.Collection ??
  model<ICollection>("Collection", collectionSchema);
