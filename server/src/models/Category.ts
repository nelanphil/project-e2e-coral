import mongoose, { Schema, model } from "mongoose";

export interface ICategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  parent?: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

categorySchema.index({ deletedAt: 1 });

export const Category =
  mongoose.models.Category ?? model<ICategory>("Category", categorySchema);
