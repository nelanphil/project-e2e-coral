import mongoose, { Schema, model } from "mongoose";

export interface IRewardLog {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: "earned" | "spent" | "adjusted";
  points: number;
  order?: mongoose.Types.ObjectId;
  description: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const rewardLogSchema = new Schema<IRewardLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["earned", "spent", "adjusted"],
      required: true,
    },
    points: { type: Number, required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    description: { type: String, default: "" },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

rewardLogSchema.index({ user: 1 });
rewardLogSchema.index({ createdAt: -1 });

export const RewardLog =
  mongoose.models.RewardLog ?? model<IRewardLog>("RewardLog", rewardLogSchema);
