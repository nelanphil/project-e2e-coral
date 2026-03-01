import mongoose, { Schema, model } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email?: string;
  passwordHash?: string;
  name: string;
  role: "customer" | "admin" | "guest";
  pointsBalance?: number;
  cookieId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  visitCount?: number;
  lastVisit?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: false, unique: true, sparse: true },
    passwordHash: { type: String, required: false },
    name: { type: String, default: "" },
    role: { type: String, enum: ["customer", "admin", "guest"], default: "customer" },
    pointsBalance: { type: Number, default: 0 },
    cookieId: { type: String, sparse: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
    visitCount: { type: Number, default: 1 },
    lastVisit: { type: Date },
  },
  { timestamps: true }
);

// Validation: customer and admin must have email and passwordHash
userSchema.pre("save", function (next) {
  if (this.isNew && (this.role === "customer" || this.role === "admin")) {
    if (!this.email || !this.passwordHash) {
      return next(new Error("Email and password are required for customer and admin roles"));
    }
  }
  next();
});

// Only add explicit index for role (email and cookieId already have unique/sparse indexes from field definition)
userSchema.index({ role: 1 });

export const User = mongoose.models.User ?? model<IUser>("User", userSchema);
