import mongoose, { Schema, model } from "mongoose";

export interface IRewardsSettings {
  _id: mongoose.Types.ObjectId;
  /** Points earned per dollar spent (e.g. 10 = $1 spent earns 10 points) */
  pointsPerDollar: number;
  /** Points needed for 100 cents / $1 discount (e.g. 100 = 100 points redeem for $1) */
  pointsToCents: number;
  updatedAt: Date;
}

const rewardsSettingsSchema = new Schema<IRewardsSettings>(
  {
    pointsPerDollar: { type: Number, default: 10 },
    pointsToCents: { type: Number, default: 100 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const RewardsSettings =
  mongoose.models.RewardsSettings ??
  model<IRewardsSettings>("RewardsSettings", rewardsSettingsSchema);
