import { Router } from "express";
import mongoose from "mongoose";
import Stripe from "stripe";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import type { IOrder } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { PriceLog } from "../models/PriceLog.js";
import { ShippingSettings } from "../models/ShippingSettings.js";
import { RewardsSettings } from "../models/RewardsSettings.js";
import { RewardLog } from "../models/RewardLog.js";
import { OrderStatusLog } from "../models/OrderStatusLog.js";
import { User } from "../models/User.js";
import { processRefundReversals } from "../lib/order-refund.js";
import { logOrderStatusChange } from "../lib/order-status-log.js";
import { verifyStripePayment } from "./orders.js";

import { Discount } from "../models/Discount.js";
import { TickerItem } from "../models/TickerItem.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export const adminRouter = Router();

adminRouter.use(requireAdmin);

async function buildAdminOrderResponse(orderId: string) {
  const order = await Order.findById(orderId)
    .populate("user", "name email role")
    .populate("lineItems.product", "name slug images price")
    .lean();

  if (!order) return null;

  const statusHistory = await OrderStatusLog.find({ order: orderId })
    .sort({ createdAt: 1 })
    .populate("performedBy", "name email")
    .lean();

  return {
    ...order,
    statusHistory,
  };
}

type ActivityTab = "paid" | "cart" | "checkedOut";

adminRouter.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const month = Math.min(
      12,
      Math.max(1, parseInt(String(req.query.month), 10) || now.getMonth() + 1),
    );
    const year = parseInt(String(req.query.year), 10) || now.getFullYear();
    const activityTab = (req.query.activityTab as ActivityTab) || "paid";

    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 1);
    const dateFilter = { $gte: dateFrom, $lt: dateTo };

    const [
      totalOrders,
      totalProducts,
      inStockResult,
      totalCategories,
      revenueResult,
      recentActivity,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: dateFilter }),
      Product.countDocuments({ deletedAt: null }),
      Inventory.aggregate<{ count: number }>([
        { $match: { quantity: { $gt: 0 } } },
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "p",
          },
        },
        { $match: { "p.deletedAt": null } },
        { $count: "count" },
      ]),
      Category.countDocuments({}),
      Order.aggregate<{ total: number }>([
        {
          $match: {
            status: { $in: ["processing", "shipped", "delivered"] },
            createdAt: dateFilter,
          },
        },
        {
          $addFields: {
            orderSubtotal: {
              $sum: {
                $map: {
                  input: "$lineItems",
                  as: "item",
                  in: { $multiply: ["$$item.price", "$$item.quantity"] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $subtract: [
                  "$orderSubtotal",
                  {
                    $add: [
                      { $ifNull: ["$discountAmountCents", 0] },
                      { $ifNull: ["$pointsDiscountCents", 0] },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
      (async () => {
        if (activityTab === "paid") {
          const orders = await Order.find({
            createdAt: dateFilter,
            status: { $in: ["processing", "shipped", "delivered"] },
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
            const lineItems = (c.items ?? []).map(
              (i: {
                product: { name?: string; price?: number } | null;
                quantity: number;
              }) => ({
                product: i.product
                  ? {
                      name: i.product.name ?? "Product",
                      price: i.product.price ?? 0,
                    }
                  : { name: "Product", price: 0 },
                quantity: i.quantity,
                price: (i.product as { price?: number })?.price ?? 0,
              }),
            );
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
    res.json({
      totalOrders,
      totalProducts,
      inStockProducts,
      totalCategories,
      revenue,
      recentActivity,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

adminRouter.get("/orders", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const rawLimit = parseInt(String(req.query.limit), 10) || 50;
    const limit = [50, 100, 150, 250].includes(rawLimit) ? rawLimit : 50;
    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : "";
    const paymentStatus =
      typeof req.query.paymentStatus === "string"
        ? req.query.paymentStatus.trim()
        : "";
    const fromDate =
      typeof req.query.fromDate === "string" ? req.query.fromDate.trim() : "";
    const toDate =
      typeof req.query.toDate === "string" ? req.query.toDate.trim() : "";

    // Build date filter (shared by both the query and the counts aggregation)
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1); // inclusive end date
      dateFilter.$lt = to;
    }

    // Base filter for the main query
    const filter: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // Search: match orderNumber, email, or user name
    if (search) {
      const regex = { $regex: search, $options: "i" };
      // Find user IDs that match the search by name or email
      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      })
        .select("_id")
        .lean();
      const userIds = matchingUsers.map((u) => u._id);
      filter.$or = [
        { orderNumber: regex },
        { email: regex },
        ...(userIds.length ? [{ user: { $in: userIds } }] : []),
      ];
    }

    // Counts aggregation — scoped to date range but NOT status/paymentStatus filters
    const countsFilter: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length) countsFilter.createdAt = dateFilter;

    const [orders, total, countsResult, revenueResult] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email role")
        .populate("lineItems.product", "name slug images")
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: countsFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            processing: {
              $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] },
            },

            shipped: {
              $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            refunded: {
              $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            ...countsFilter,
            status: { $in: ["processing", "shipped", "delivered"] },
          },
        },
        {
          $addFields: {
            orderSubtotal: {
              $sum: {
                $map: {
                  input: "$lineItems",
                  as: "item",
                  in: { $multiply: ["$$item.price", "$$item.quantity"] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $subtract: [
                  "$orderSubtotal",
                  {
                    $add: [
                      { $ifNull: ["$discountAmountCents", 0] },
                      { $ifNull: ["$pointsDiscountCents", 0] },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const counts = countsResult[0] ?? {
      total: 0,
      pending: 0,
      processing: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };
    delete counts._id;
    const revenue = revenueResult[0]?.total ?? 0;

    res.json({ orders, total, page, limit, counts, revenue });
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

adminRouter.get("/orders/:id", async (req, res) => {
  try {
    // Verify payment status with Stripe before returning order data
    await verifyStripePayment(req.params.id);

    const order = await buildAdminOrderResponse(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ order });
  } catch {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

adminRouter.patch("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body as { status?: string };
    const performedBy = (req as AuthRequest).userId;
    const validStatuses = [
      "pending",
      "processing",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    if (!status || !validStatuses.includes(status)) {
      res
        .status(400)
        .json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const existingOrder = (await Order.findById(req.params.id)
      .select("status")
      .lean()) as { status?: string } | null;
    if (!existingOrder) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const updatedOrder = (await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true },
    ).lean()) as { status?: string } | null;
    if (!updatedOrder) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await logOrderStatusChange({
      orderId: req.params.id,
      statusBefore: existingOrder.status,
      statusAfter: updatedOrder.status,
      reason: "admin_change",
      performedBy,
    });

    const order = await buildAdminOrderResponse(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order });
  } catch {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

adminRouter.patch("/orders/:id/tracking", async (req, res) => {
  try {
    const { trackingNumber } = req.body as { trackingNumber?: string };
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { trackingNumber: trackingNumber?.trim() || null } },
      { new: true },
    ).lean();
    if (!updatedOrder) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = await buildAdminOrderResponse(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order });
  } catch {
    res.status(500).json({ error: "Failed to update tracking" });
  }
});

adminRouter.post("/orders/:id/refund", async (req, res) => {
  try {
    const performedBy = (req as AuthRequest).userId;
    const order = (await Order.findById(req.params.id)) as IOrder | null;
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.status === "refunded" || order.paymentStatus === "refunded") {
      res.status(400).json({ error: "Order has already been refunded" });
      return;
    }
    if (!order.stripePaymentIntentId) {
      res.status(400).json({
        error:
          "No Stripe payment intent found for this order. Cannot process refund.",
      });
      return;
    }
    if (!stripe) {
      res.status(500).json({ error: "Stripe is not configured" });
      return;
    }

    // Issue full refund via Stripe
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
    });

    // Update order status
    await Order.updateOne(
      { _id: order._id },
      { $set: { status: "refunded", paymentStatus: "refunded" } },
    );

    await logOrderStatusChange({
      orderId: order._id,
      statusBefore: order.status,
      statusAfter: "refunded",
      reason: "admin_refund",
      performedBy,
    });

    // Process all reversals (rewards + inventory)
    await processRefundReversals(order);

    const updated = await buildAdminOrderResponse(req.params.id);

    res.json({ order: updated, message: "Refund processed successfully" });
  } catch (err) {
    console.error("Refund error:", err);
    res.status(500).json({ error: "Failed to process refund" });
  }
});

adminRouter.get("/inventory", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(
      250,
      Math.max(1, parseInt(String(req.query.limit), 10) || 50),
    );
    const search = (req.query.search as string)?.trim();
    const sortField = (req.query.sort as string) || "updatedAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const allowedSortFields: Record<string, string> = {
      name: "product.name",
      price: "product.price",
      cost: "product.cost",
      quantity: "quantity",
      updatedAt: "updatedAt",
    };
    const sortKey = allowedSortFields[sortField] ?? "updatedAt";
    const sortObj: Record<string, 1 | -1> = { [sortKey]: sortOrder };

    const pipeline: mongoose.mongo.PipelineStage[] = [
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      {
        $addFields: {
          product: { $arrayElemAt: ["$productDoc", 0] },
        },
      },
      { $match: { product: { $ne: null } } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          "product.name": { $regex: search, $options: "i" },
        },
      });
    }

    pipeline.push(
      {
        $facet: {
          metadata: [{ $count: "total" }],
          inventory: [
            { $sort: sortObj },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                product: {
                  _id: "$product._id",
                  name: "$product.name",
                  slug: "$product.slug",
                  price: "$product.price",
                  cost: "$product.cost",
                  isActive: "$product.isActive",
                  deletedAt: "$product.deletedAt",
                },
                quantity: 1,
                updatedAt: 1,
              },
            },
          ],
        },
      },
    );

    const result = await Inventory.aggregate(pipeline);
    const metadata = result[0]?.metadata?.[0];
    const total = metadata?.total ?? 0;
    const inventory = result[0]?.inventory ?? [];

    res.json({ inventory, total, page, limit });
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
    const settings = (await ShippingSettings.findOne().lean()) as {
      shippingAmountFlorida?: number;
      shippingAmountOther?: number;
      freeShippingThresholdCents?: number;
    } | null;
    res.json({
      shippingAmountFlorida: settings?.shippingAmountFlorida ?? 0,
      shippingAmountOther: settings?.shippingAmountOther ?? 0,
      freeShippingThresholdCents: settings?.freeShippingThresholdCents ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch shipping settings" });
  }
});

adminRouter.put("/shipping", async (req, res) => {
  try {
    const {
      shippingAmountFlorida,
      shippingAmountOther,
      freeShippingThresholdCents,
    } = req.body as {
      shippingAmountFlorida?: number;
      shippingAmountOther?: number;
      freeShippingThresholdCents?: number;
    };
    const florida =
      typeof shippingAmountFlorida === "number" && shippingAmountFlorida >= 0
        ? Math.round(shippingAmountFlorida)
        : undefined;
    const other =
      typeof shippingAmountOther === "number" && shippingAmountOther >= 0
        ? Math.round(shippingAmountOther)
        : undefined;
    const threshold =
      typeof freeShippingThresholdCents === "number" &&
      freeShippingThresholdCents >= 0
        ? Math.round(freeShippingThresholdCents)
        : undefined;
    const settings = (await ShippingSettings.findOneAndUpdate(
      {},
      {
        $set: {
          ...(florida !== undefined && { shippingAmountFlorida: florida }),
          ...(other !== undefined && { shippingAmountOther: other }),
          ...(threshold !== undefined && {
            freeShippingThresholdCents: threshold,
          }),
        },
      },
      { upsert: true, new: true },
    ).lean()) as {
      shippingAmountFlorida?: number;
      shippingAmountOther?: number;
      freeShippingThresholdCents?: number;
    } | null;
    res.json({
      shippingAmountFlorida: settings?.shippingAmountFlorida ?? 0,
      shippingAmountOther: settings?.shippingAmountOther ?? 0,
      freeShippingThresholdCents: settings?.freeShippingThresholdCents ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to update shipping settings" });
  }
});

adminRouter.get("/rewards", async (_req, res) => {
  try {
    const settings = (await RewardsSettings.findOne().lean()) as {
      pointsPerDollar?: number;
      pointsToCents?: number;
    } | null;
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
    const perDollar =
      typeof pointsPerDollar === "number" && pointsPerDollar >= 0
        ? Math.round(pointsPerDollar)
        : undefined;
    const toCents =
      typeof pointsToCents === "number" && pointsToCents > 0
        ? Math.round(pointsToCents)
        : undefined;
    const settings = (await RewardsSettings.findOneAndUpdate(
      {},
      {
        $set: {
          ...(perDollar !== undefined && { pointsPerDollar: perDollar }),
          ...(toCents !== undefined && { pointsToCents: toCents }),
        },
      },
      { upsert: true, new: true },
    ).lean()) as { pointsPerDollar?: number; pointsToCents?: number } | null;
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
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit), 10) || 50),
    );
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
      res
        .status(400)
        .json({ error: "Adjustment would result in negative balance" });
      return;
    }
    await User.findByIdAndUpdate(targetUserId, {
      $set: { pointsBalance: newBalance },
    });
    await RewardLog.create({
      user: targetUserId,
      type: "adjusted",
      points,
      description:
        (description ?? "Manual adjustment").trim() || "Manual adjustment",
      performedBy: (req as AuthRequest).userId,
    });
    res.json({ pointsBalance: newBalance });
  } catch {
    res.status(500).json({ error: "Failed to adjust points" });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────

adminRouter.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const rawLimit = parseInt(String(req.query.limit), 10) || 50;
    const limit = [50, 100, 150, 250].includes(rawLimit) ? rawLimit : 50;
    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role =
      typeof req.query.role === "string" ? req.query.role.trim() : "";

    const filter: Record<string, unknown> = {};
    if (role && ["customer", "admin", "guest"].includes(role)) {
      filter.role = role;
    }
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, total, roleCounts] = await Promise.all([
      User.find(filter)
        .select("email name role pointsBalance lastVisit createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            customer: {
              $sum: { $cond: [{ $eq: ["$role", "customer"] }, 1, 0] },
            },
            admin: {
              $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
            },
            guest: {
              $sum: { $cond: [{ $eq: ["$role", "guest"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const counts = roleCounts[0] ?? { total: 0, customer: 0, admin: 0, guest: 0 };
    delete counts._id;

    res.json({ users, total, page, limit, counts });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

adminRouter.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("email name role pointsBalance visitCount lastVisit ipAddress userAgent referrer createdAt updatedAt")
      .lean();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const orders = await Order.find({ user: req.params.id })
      .select("orderNumber status paymentStatus lineItems taxAmount shippingAmount discountAmountCents pointsDiscountCents createdAt")
      .populate("lineItems.product", "name slug images")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const totalOrders = await Order.countDocuments({ user: req.params.id });

    const totalSpent = orders.reduce((sum, o) => {
      const lineTotal = o.lineItems.reduce(
        (s: number, li: { price: number; quantity: number }) => s + li.price * li.quantity,
        0,
      );
      return (
        sum +
        lineTotal +
        (o.taxAmount ?? 0) +
        (o.shippingAmount ?? 0) -
        (o.pointsDiscountCents ?? 0) -
        (o.discountAmountCents ?? 0)
      );
    }, 0);

    res.json({ user, orders, totalOrders, totalSpent });
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ─── Discount CRUD ───────────────────────────────────────────────────────────

adminRouter.get("/discounts", async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit), 10) || 50),
    );
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (!includeInactive) filter.isActive = true;

    const [discounts, total] = await Promise.all([
      Discount.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("applicableProducts", "name slug")
        .lean(),
      Discount.countDocuments(filter),
    ]);
    res.json({ discounts, total, page, limit });
  } catch {
    res.status(500).json({ error: "Failed to fetch discounts" });
  }
});

adminRouter.post("/discounts", async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      valueType,
      valueCents,
      valuePercent,
      maxDiscountCents,
      minOrderCents,
      maxUsesTotal,
      maxUsesPerUser,
      startDate,
      expiresAt,
      isActive,
      firstOrderOnly,
      applicableProducts,
    } = req.body;

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "code is required" });
      return;
    }
    if (!["product", "shipping"].includes(discountType)) {
      res
        .status(400)
        .json({ error: "discountType must be 'product' or 'shipping'" });
      return;
    }
    if (!["percentage", "fixed"].includes(valueType)) {
      res
        .status(400)
        .json({ error: "valueType must be 'percentage' or 'fixed'" });
      return;
    }

    const existing = await Discount.findOne({
      code: code.toUpperCase().trim(),
    });
    if (existing) {
      res
        .status(409)
        .json({ error: "A discount with this code already exists" });
      return;
    }

    const discount = await Discount.create({
      code: code.toUpperCase().trim(),
      description: typeof description === "string" ? description.trim() : "",
      discountType,
      valueType,
      valueCents:
        typeof valueCents === "number"
          ? Math.max(0, Math.round(valueCents))
          : 0,
      valuePercent:
        typeof valuePercent === "number"
          ? Math.max(0, Math.min(100, valuePercent))
          : 0,
      maxDiscountCents:
        typeof maxDiscountCents === "number"
          ? Math.max(0, Math.round(maxDiscountCents))
          : 0,
      minOrderCents:
        typeof minOrderCents === "number"
          ? Math.max(0, Math.round(minOrderCents))
          : 0,
      maxUsesTotal:
        typeof maxUsesTotal === "number"
          ? Math.max(0, Math.round(maxUsesTotal))
          : 0,
      maxUsesPerUser:
        typeof maxUsesPerUser === "number"
          ? Math.max(0, Math.round(maxUsesPerUser))
          : 0,
      startDate: startDate ? new Date(startDate) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: typeof isActive === "boolean" ? isActive : true,
      firstOrderOnly:
        typeof firstOrderOnly === "boolean" ? firstOrderOnly : false,
      applicableProducts: Array.isArray(applicableProducts)
        ? applicableProducts
        : [],
    });

    res.status(201).json({ discount });
  } catch {
    res.status(500).json({ error: "Failed to create discount" });
  }
});

adminRouter.put("/discounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      valueType,
      valueCents,
      valuePercent,
      maxDiscountCents,
      minOrderCents,
      maxUsesTotal,
      maxUsesPerUser,
      startDate,
      expiresAt,
      isActive,
      firstOrderOnly,
      applicableProducts,
    } = req.body;

    const update: Record<string, unknown> = {};
    if (code && typeof code === "string")
      update.code = code.toUpperCase().trim();
    if (typeof description === "string")
      update.description = description.trim();
    if (discountType && ["product", "shipping"].includes(discountType))
      update.discountType = discountType;
    if (valueType && ["percentage", "fixed"].includes(valueType))
      update.valueType = valueType;
    if (typeof valueCents === "number")
      update.valueCents = Math.max(0, Math.round(valueCents));
    if (typeof valuePercent === "number")
      update.valuePercent = Math.max(0, Math.min(100, valuePercent));
    if (typeof maxDiscountCents === "number")
      update.maxDiscountCents = Math.max(0, Math.round(maxDiscountCents));
    if (typeof minOrderCents === "number")
      update.minOrderCents = Math.max(0, Math.round(minOrderCents));
    if (typeof maxUsesTotal === "number")
      update.maxUsesTotal = Math.max(0, Math.round(maxUsesTotal));
    if (typeof maxUsesPerUser === "number")
      update.maxUsesPerUser = Math.max(0, Math.round(maxUsesPerUser));
    if (startDate !== undefined)
      update.startDate = startDate ? new Date(startDate) : null;
    if (expiresAt !== undefined)
      update.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (typeof firstOrderOnly === "boolean")
      update.firstOrderOnly = firstOrderOnly;
    if (Array.isArray(applicableProducts))
      update.applicableProducts = applicableProducts;

    const discount = await Discount.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    )
      .populate("applicableProducts", "name slug")
      .lean();
    if (!discount) {
      res.status(404).json({ error: "Discount not found" });
      return;
    }
    res.json({ discount });
  } catch {
    res.status(500).json({ error: "Failed to update discount" });
  }
});

adminRouter.get("/discounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await Discount.findById(id)
      .populate("applicableProducts", "name")
      .lean();
    if (!discount) {
      res.status(404).json({ error: "Discount not found" });
      return;
    }
    res.json({ discount });
  } catch {
    res.status(500).json({ error: "Failed to fetch discount" });
  }
});

adminRouter.delete("/discounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) {
      res.status(404).json({ error: "Discount not found" });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete discount" });
  }
});

adminRouter.get("/discounts/:id/usage", async (req, res) => {
  try {
    const { id } = req.params;
    const discount = (await Discount.findById(id)
      .populate("usageLog.userId", "email name")
      .populate("usageLog.orderId", "_id createdAt")
      .lean()) as { usageLog?: unknown[]; usedCount?: number } | null;
    if (!discount) {
      res.status(404).json({ error: "Discount not found" });
      return;
    }
    res.json({ usageLog: discount.usageLog, usedCount: discount.usedCount });
  } catch {
    res.status(500).json({ error: "Failed to fetch usage log" });
  }
});

// ── Ticker Banner ─────────────────────────────────────────────────────────────

adminRouter.get("/ticker-items", async (_req, res) => {
  try {
    const items = await TickerItem.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ items });
  } catch {
    res.status(500).json({ error: "Failed to fetch ticker items" });
  }
});

adminRouter.post("/ticker-items", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    const last = await TickerItem.findOne({ deletedAt: null })
      .sort({ sortOrder: -1 })
      .lean();
    const sortOrder = last ? (last.sortOrder ?? 0) + 1 : 0;
    const item = await TickerItem.create({ text: text.trim(), deletedAt: null, sortOrder });
    res.status(201).json({ item });
  } catch {
    res.status(500).json({ error: "Failed to create ticker item" });
  }
});

adminRouter.put("/ticker-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    const item = await TickerItem.findByIdAndUpdate(
      id,
      { $set: { text: text.trim() } },
      { new: true },
    ).lean();
    if (!item) {
      res.status(404).json({ error: "Ticker item not found" });
      return;
    }
    res.json({ item });
  } catch {
    res.status(500).json({ error: "Failed to update ticker item" });
  }
});

adminRouter.patch("/ticker-items/:id/move", async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body as { direction: "up" | "down" };
    if (direction !== "up" && direction !== "down") {
      res.status(400).json({ error: "direction must be 'up' or 'down'" });
      return;
    }
    const allActive = await TickerItem.find({ deletedAt: null })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    const idx = allActive.findIndex((i) => String(i._id) === id);
    if (idx === -1) {
      res.status(404).json({ error: "Ticker item not found" });
      return;
    }
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allActive.length) {
      res.status(400).json({ error: "Cannot move item in that direction" });
      return;
    }
    const current = allActive[idx];
    const sibling = allActive[swapIdx];
    const currentOrder = current.sortOrder ?? idx;
    const siblingOrder = sibling.sortOrder ?? swapIdx;
    await Promise.all([
      TickerItem.findByIdAndUpdate(current._id, { $set: { sortOrder: siblingOrder } }),
      TickerItem.findByIdAndUpdate(sibling._id, { $set: { sortOrder: currentOrder } }),
    ]);
    const updated = await TickerItem.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ items: updated });
  } catch {
    res.status(500).json({ error: "Failed to reorder ticker items" });
  }
});

adminRouter.patch("/ticker-items/:id/soft-delete", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await TickerItem.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true },
    ).lean();
    if (!item) {
      res.status(404).json({ error: "Ticker item not found" });
      return;
    }
    res.json({ item });
  } catch {
    res.status(500).json({ error: "Failed to soft-delete ticker item" });
  }
});

adminRouter.patch("/ticker-items/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await TickerItem.findByIdAndUpdate(
      id,
      { $set: { deletedAt: null } },
      { new: true },
    ).lean();
    if (!item) {
      res.status(404).json({ error: "Ticker item not found" });
      return;
    }
    res.json({ item });
  } catch {
    res.status(500).json({ error: "Failed to restore ticker item" });
  }
});

adminRouter.delete("/ticker-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await TickerItem.findById(id).lean();
    if (!existing) {
      res.status(404).json({ error: "Ticker item not found" });
      return;
    }
    if (!existing.deletedAt) {
      res
        .status(400)
        .json({ error: "Item must be soft-deleted before permanent deletion" });
      return;
    }
    await TickerItem.findByIdAndDelete(id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete ticker item" });
  }
});
