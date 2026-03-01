import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { PriceLog } from "../models/PriceLog.js";
import { ShippingSettings } from "../models/ShippingSettings.js";
import { RewardsSettings } from "../models/RewardsSettings.js";
import { RewardLog } from "../models/RewardLog.js";
import { User } from "../models/User.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

type ActivityTab = "paid" | "cart" | "checkedOut";

adminRouter.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const month = Math.min(12, Math.max(1, parseInt(String(req.query.month), 10) || now.getMonth() + 1));
    const year = parseInt(String(req.query.year), 10) || now.getFullYear();
    const activityTab = (req.query.activityTab as ActivityTab) || "paid";

    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 1);
    const dateFilter = { $gte: dateFrom, $lt: dateTo };

    const [totalOrders, totalProducts, inStockResult, totalCategories, revenueResult, recentActivity] =
      await Promise.all([
        Order.countDocuments({ createdAt: dateFilter }),
        Product.countDocuments({ deletedAt: null }),
        Inventory.aggregate<{ count: number }>([
          { $match: { quantity: { $gt: 0 } } },
          { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
          { $match: { "p.deletedAt": null } },
          { $count: "count" },
        ]),
        Category.countDocuments({}),
        Order.aggregate<{ total: number }>([
          {
            $match: {
              status: { $in: ["paid", "shipped", "delivered"] },
              createdAt: dateFilter,
            },
          },
          { $unwind: "$lineItems" },
          {
            $group: {
              _id: null,
              total: {
                $sum: { $multiply: ["$lineItems.price", "$lineItems.quantity"] },
              },
            },
          },
        ]),
        (async () => {
          if (activityTab === "paid") {
            const orders = await Order.find({
              createdAt: dateFilter,
              status: { $in: ["paid", "shipped", "delivered"] },
            })
              .sort({ createdAt: -1 })
              .limit(10)
              .populate("lineItems.product", "name")
              .lean();
            return orders.map((o) => ({
              type: "order" as const,
              _id: o._id,
              status: o.status,
              createdAt: o.createdAt,
              lineItems: o.lineItems,
              shippingAddress: o.shippingAddress,
              ipAddress: o.ipAddress,
              userAgent: o.userAgent,
              referer: o.referer,
              geoCity: o.geoCity,
              geoRegion: o.geoRegion,
              geoCountry: o.geoCountry,
            }));
          }
          if (activityTab === "checkedOut") {
            const orders = await Order.find({
              createdAt: dateFilter,
              status: "pending",
            })
              .sort({ createdAt: -1 })
              .limit(10)
              .populate("lineItems.product", "name")
              .lean();
            return orders.map((o) => ({
              type: "order" as const,
              _id: o._id,
              status: o.status,
              createdAt: o.createdAt,
              lineItems: o.lineItems,
              shippingAddress: o.shippingAddress,
              ipAddress: o.ipAddress,
              userAgent: o.userAgent,
              referer: o.referer,
              geoCity: o.geoCity,
              geoRegion: o.geoRegion,
              geoCountry: o.geoCountry,
            }));
          }
          if (activityTab === "cart") {
            const carts = await Cart.find({
              items: { $exists: true, $ne: [] },
              lastActivityAt: dateFilter,
            })
              .sort({ lastActivityAt: -1 })
              .limit(10)
              .populate("items.product", "name price")
              .lean();
            return carts.map((c) => {
              const lineItems = (c.items ?? []).map((i: { product: { name?: string; price?: number } | null; quantity: number }) => ({
                product: i.product ? { name: i.product.name ?? "Product", price: i.product.price ?? 0 } : { name: "Product", price: 0 },
                quantity: i.quantity,
                price: (i.product as { price?: number })?.price ?? 0,
              }));
              return {
                type: "cart" as const,
                _id: c._id,
                sessionId: c.sessionId,
                lastActivityAt: c.lastActivityAt,
                lineItems,
                ipAddress: c.ipAddress,
                userAgent: c.userAgent,
                referer: c.referer,
                geoCity: c.geoCity,
                geoRegion: c.geoRegion,
                geoCountry: c.geoCountry,
              };
            });
          }
          return [];
        })(),
      ]);

    const revenue = revenueResult[0]?.total ?? 0;
    const inStockProducts = inStockResult[0]?.count ?? 0;
    res.json({ totalOrders, totalProducts, inStockProducts, totalCategories, revenue, recentActivity });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

adminRouter.get("/orders", async (_req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("lineItems.product")
    .lean();
  res.json({ orders });
});

adminRouter.get("/inventory", async (_req, res) => {
  try {
    const inventories = await Inventory.find()
      .populate({ path: "product", select: "name slug price cost isActive deletedAt" })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ inventory: inventories });
  } catch {
    res.status(500).json({ error: "Failed to list inventory" });
  }
});

adminRouter.put("/inventory/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, reason, notes } = req.body;

    if (quantity == null) {
      res.status(400).json({ error: "quantity is required" });
      return;
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    let inv = await Inventory.findOne({ product: productId });
    if (!inv) {
      inv = await Inventory.create({ product: productId, quantity: 0 });
    }

    const oldQty = inv.quantity;
    const newQty = Number(quantity);

    if (oldQty !== newQty) {
      inv.quantity = newQty;
      await inv.save();

      await InventoryLog.create({
        product: productId,
        quantityBefore: oldQty,
        quantityAfter: newQty,
        change: newQty - oldQty,
        reason: reason || "manual",
        notes: notes?.trim() || "",
        performedBy: (req as any).userId,
      });
    }

    res.json({ inventory: inv });
  } catch {
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

adminRouter.get("/inventory/:productId/logs", async (req, res) => {
  try {
    const { productId } = req.params;
    const logs = await InventoryLog.find({ product: productId })
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ logs });
  } catch {
    res.status(500).json({ error: "Failed to get inventory logs" });
  }
});

adminRouter.get("/products/:productId/price-logs", async (req, res) => {
  try {
    const { productId } = req.params;
    const logs = await PriceLog.find({ product: productId })
      .populate("changedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ logs });
  } catch {
    res.status(500).json({ error: "Failed to get price logs" });
  }
});

adminRouter.get("/shipping", async (_req, res) => {
  try {
    const settings = await ShippingSettings.findOne().lean();
    res.json({
      shippingAmountFlorida: settings?.shippingAmountFlorida ?? 0,
      shippingAmountOther: settings?.shippingAmountOther ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch shipping settings" });
  }
});

adminRouter.put("/shipping", async (req, res) => {
  try {
    const { shippingAmountFlorida, shippingAmountOther } = req.body as {
      shippingAmountFlorida?: number;
      shippingAmountOther?: number;
    };
    const florida = typeof shippingAmountFlorida === "number" && shippingAmountFlorida >= 0 ? Math.round(shippingAmountFlorida) : undefined;
    const other = typeof shippingAmountOther === "number" && shippingAmountOther >= 0 ? Math.round(shippingAmountOther) : undefined;
    const settings = await ShippingSettings.findOneAndUpdate(
      {},
      { $set: { ...(florida !== undefined && { shippingAmountFlorida: florida }), ...(other !== undefined && { shippingAmountOther: other }) } },
      { upsert: true, new: true }
    ).lean();
    res.json({
      shippingAmountFlorida: settings?.shippingAmountFlorida ?? 0,
      shippingAmountOther: settings?.shippingAmountOther ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to update shipping settings" });
  }
});

adminRouter.get("/rewards", async (_req, res) => {
  try {
    const settings = await RewardsSettings.findOne().lean() as { pointsPerDollar?: number; pointsToCents?: number } | null;
    res.json({
      pointsPerDollar: settings?.pointsPerDollar ?? 10,
      pointsToCents: settings?.pointsToCents ?? 100,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch rewards settings" });
  }
});

adminRouter.put("/rewards", async (req, res) => {
  try {
    const { pointsPerDollar, pointsToCents } = req.body as {
      pointsPerDollar?: number;
      pointsToCents?: number;
    };
    const perDollar = typeof pointsPerDollar === "number" && pointsPerDollar >= 0 ? Math.round(pointsPerDollar) : undefined;
    const toCents = typeof pointsToCents === "number" && pointsToCents > 0 ? Math.round(pointsToCents) : undefined;
    const settings = await RewardsSettings.findOneAndUpdate(
      {},
      { $set: { ...(perDollar !== undefined && { pointsPerDollar: perDollar }), ...(toCents !== undefined && { pointsToCents: toCents }) } },
      { upsert: true, new: true }
    ).lean() as { pointsPerDollar?: number; pointsToCents?: number } | null;
    res.json({
      pointsPerDollar: settings?.pointsPerDollar ?? 10,
      pointsToCents: settings?.pointsToCents ?? 100,
    });
  } catch {
    res.status(500).json({ error: "Failed to update rewards settings" });
  }
});

adminRouter.get("/rewards/users", async (_req, res) => {
  try {
    const users = await User.find({ pointsBalance: { $gt: 0 } })
      .select("email name pointsBalance lastVisit")
      .sort({ pointsBalance: -1 })
      .lean();
    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to list users with points" });
  }
});

adminRouter.get("/rewards/logs", async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const skip = (page - 1) * limit;
    const logs = await RewardLog.find()
      .populate("user", "email name")
      .populate("order", "_id")
      .populate("performedBy", "email name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await RewardLog.countDocuments();
    res.json({ logs, total, page, limit });
  } catch {
    res.status(500).json({ error: "Failed to fetch reward logs" });
  }
});

adminRouter.post("/rewards/adjust", async (req, res) => {
  try {
    const { userId, email, points, description } = req.body as {
      userId?: string;
      email?: string;
      points?: number;
      description?: string;
    };
    if (typeof points !== "number") {
      res.status(400).json({ error: "points is required" });
      return;
    }
    let targetUserId = userId;
    if (!targetUserId && email && typeof email === "string") {
      const u = await User.findOne({ email: email.trim().toLowerCase() });
      targetUserId = u?._id?.toString();
    }
    if (!targetUserId) {
      res.status(400).json({ error: "userId or email is required" });
      return;
    }
    const user = await User.findById(targetUserId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const currentBalance = user.pointsBalance ?? 0;
    const newBalance = currentBalance + points;
    if (newBalance < 0) {
      res.status(400).json({ error: "Adjustment would result in negative balance" });
      return;
    }
    await User.findByIdAndUpdate(targetUserId, { $set: { pointsBalance: newBalance } });
    await RewardLog.create({
      user: targetUserId,
      type: "adjusted",
      points,
      description: (description ?? "Manual adjustment").trim() || "Manual adjustment",
      performedBy: (req as AuthRequest).userId,
    });
    res.json({ pointsBalance: newBalance });
  } catch {
    res.status(500).json({ error: "Failed to adjust points" });
  }
});
