import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { RewardsSettings } from "../models/RewardsSettings.js";

export const rewardsRouter = Router();

/** GET /api/rewards/balance - Return points balance for authenticated user */
rewardsRouter.get("/balance", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await User.findById(userId).select("pointsBalance").lean() as { pointsBalance?: number } | null;
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ pointsBalance: user.pointsBalance ?? 0 });
});

/** GET /api/rewards/settings - Public settings for checkout (pointsPerDollar, pointsToCents) */
rewardsRouter.get("/settings", async (_req, res) => {
  const settings = await RewardsSettings.findOne().lean() as { pointsPerDollar?: number; pointsToCents?: number } | null;
  res.json({
    pointsPerDollar: settings?.pointsPerDollar ?? 10,
    pointsToCents: settings?.pointsToCents ?? 100,
  });
});
