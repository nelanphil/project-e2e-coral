import { Router } from "express";
import { TickerItem } from "../models/TickerItem.js";

export const tickerRouter = Router();

tickerRouter.get("/", async (_req, res) => {
  try {
    const items = await TickerItem.find({ deletedAt: null })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.json({ items });
  } catch {
    res.status(500).json({ error: "Failed to fetch ticker items" });
  }
});
