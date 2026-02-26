import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { PriceLog } from "../models/PriceLog.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

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
