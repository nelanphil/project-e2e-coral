import mongoose, { Schema, model } from "mongoose";

export interface INewsletter {
  _id: mongoose.Types.ObjectId;
  email: string;
  subscribedAt: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new Schema<INewsletter>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    subscribedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Newsletter = mongoose.models.Newsletter ?? model<INewsletter>("Newsletter", newsletterSchema);
