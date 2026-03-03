import { Schema, model } from "mongoose";

interface IContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read";
  createdAt: Date;
}

const contactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "read"], default: "new" },
  },
  { timestamps: true }
);

export const ContactSubmission = model<IContactSubmission>(
  "ContactSubmission",
  contactSubmissionSchema
);
