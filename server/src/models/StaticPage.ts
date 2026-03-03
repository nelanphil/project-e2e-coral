import { Schema, model } from "mongoose";

interface ISection {
  key: string;
  label?: string;
  content: string;
  hidden?: boolean;
}

interface IStaticPage {
  slug: string;
  sections: ISection[];
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
  {
    key: { type: String, required: true },
    label: { type: String, required: false },
    content: { type: String, default: "" },
    hidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const staticPageSchema = new Schema<IStaticPage>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    sections: { type: [sectionSchema], default: [] },
  },
  { timestamps: true }
);

export const StaticPage = model<IStaticPage>("StaticPage", staticPageSchema);
