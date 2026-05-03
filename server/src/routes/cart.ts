import { Router, type Request } from "express";
import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { getVisitorMeta, enrichWithGeo } from "../lib/visitor-meta.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { recordSiteActivitySnapshot } from "../lib/site-activity-record.js";

export const cartRouter = Router();

cartRouter.use(optionalAuth);

function getSessionId(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const id = req.headers["x-cart-session"];
  const s = Array.isArray(id) ? id[0] : id;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

type PopulatedItem = { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number };

async function refreshCartActivity(cart: { _id: unknown; items: unknown[] } | null) {
  if (cart && Array.isArray(cart.items) && cart.items.length > 0) {
    await Cart.updateOne(
      { _id: cart._id },
      { $set: { lastActivityAt: new Date() } }
    );
  }
}

async function updateCartVisitorMeta(cartId: unknown, req: Request) {
  const meta = getVisitorMeta(req);
  if (Object.keys(meta).length === 0) return;
  await Cart.updateOne({ _id: cartId }, { $set: meta });
  if (meta.ipAddress) {
    enrichWithGeo(meta.ipAddress)
      .then((geo) => {
        if (Object.keys(geo).length > 0) {
          Cart.updateOne({ _id: cartId }, { $set: geo }).catch(() => {});
        }
      })
      .catch(() => {});
  }
}

function mapCartToItems(populated: { items: PopulatedItem[] } | null) {
  return (populated?.items ?? []).map((i: PopulatedItem) => ({
    productId: i.product?._id,
    name: i.product?.name,
    slug: i.product?.slug,
    price: i.product?.price,
    image: i.product?.images?.[0] ?? null,
    quantity: i.quantity,
  }));
}

cartRouter.get("/", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.json({ items: [], sessionId: null });
    return;
  }
  try {
    const cart = await Cart.findOne({ sessionId }).populate("items.product").lean() as { _id: unknown; items: { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number }[] } | null;
    if (!cart) {
      recordSiteActivitySnapshot(req as AuthRequest, "cart");
      res.json({ items: cartItemsToResponse([]), sessionId });
      return;
    }
    await refreshCartActivity(cart);
    if (cart.items.length > 0) {
      await updateCartVisitorMeta(cart._id, req);
    }
    recordSiteActivitySnapshot(req as AuthRequest, "cart");
    const items = mapCartToItems(cart).filter(Boolean);
    res.json({ items, sessionId });
  } catch {
    res.status(500).json({ error: "Failed to get cart" });
  }
});

function cartItemsToResponse(items: { product?: unknown; quantity: number }[]) {
  return items.map((i) => ({
    productId: (i.product as { _id?: string })?._id,
    quantity: i.quantity,
  }));
}

cartRouter.post("/", async (req, res) => {
  const sessionId = getSessionId(req) ?? new mongoose.Types.ObjectId().toString();
  const { productId, quantity = 1 } = req.body as { productId?: string; quantity?: number };
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: "Invalid productId" });
    return;
  }
  const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
  try {
    let inv = await Inventory.findOne({ product: new mongoose.Types.ObjectId(productId) });
    if (!inv) {
      inv = await Inventory.create({ product: new mongoose.Types.ObjectId(productId), quantity: 0 });
    }
    const available = inv.quantity;
    if (available < qty) {
      res.status(409).json({ error: "Insufficient inventory" });
      return;
    }
    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = await Cart.create({ sessionId, items: [] });
    }
    const existing = cart.items.find((i: { product: mongoose.Types.ObjectId; quantity: number }) => i.product.toString() === productId);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + qty);
    } else {
      cart.items.push({ product: new mongoose.Types.ObjectId(productId), quantity: qty });
    }
    const oldQty = inv.quantity;
    inv.quantity = oldQty - qty;
    await inv.save();
    await InventoryLog.create({
      product: new mongoose.Types.ObjectId(productId),
      quantityBefore: oldQty,
      quantityAfter: inv.quantity,
      change: -qty,
      reason: "cart_add",
    });
    cart.lastActivityAt = new Date();
    await cart.save();
    if (cart.items.length > 0) {
      await updateCartVisitorMeta(cart._id, req);
    }
    recordSiteActivitySnapshot(req as AuthRequest, "cart");
    const populated = (await Cart.findById(cart._id).populate("items.product").lean()) as { items: PopulatedItem[] } | null;
    const items = mapCartToItems(populated);
    res.setHeader("X-Cart-Session", sessionId);
    res.json({ items, sessionId });
  } catch {
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

cartRouter.delete("/:productId", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).json({ error: "Session required" });
    return;
  }
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: "Invalid productId" });
    return;
  }
  try {
    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      recordSiteActivitySnapshot(req as AuthRequest, "cart");
      res.json({ items: [], sessionId });
      return;
    }
    const item = cart.items.find((i: { product: mongoose.Types.ObjectId; quantity: number }) => i.product.toString() === productId);
    if (item) {
      let inv = await Inventory.findOne({ product: new mongoose.Types.ObjectId(productId) });
      if (!inv) {
        inv = await Inventory.create({ product: new mongoose.Types.ObjectId(productId), quantity: 0 });
      }
      const oldQty = inv.quantity;
      inv.quantity = oldQty + item.quantity;
      await inv.save();
      await InventoryLog.create({
        product: new mongoose.Types.ObjectId(productId),
        quantityBefore: oldQty,
        quantityAfter: inv.quantity,
        change: item.quantity,
        reason: "cart_remove",
      });
    }
    cart.items = cart.items.filter((i: { product: mongoose.Types.ObjectId; quantity: number }) => i.product.toString() !== productId);
    cart.lastActivityAt = new Date();
    await cart.save();
    if (cart.items.length > 0) {
      await updateCartVisitorMeta(cart._id, req);
    }
    recordSiteActivitySnapshot(req as AuthRequest, "cart");
    const populated = (await Cart.findById(cart._id).populate("items.product").lean()) as { items: PopulatedItem[] } | null;
    res.json({ items: mapCartToItems(populated), sessionId });
  } catch {
    res.status(500).json({ error: "Failed to update cart" });
  }
});

cartRouter.patch("/:productId", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).json({ error: "Session required" });
    return;
  }
  const { productId } = req.params;
  const { quantity } = req.body as { quantity?: number };
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: "Invalid productId" });
    return;
  }
  const newQty = Math.max(0, Math.min(99, Math.floor(Number(quantity ?? 0))));
  try {
    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      recordSiteActivitySnapshot(req as AuthRequest, "cart");
      res.json({ items: [], sessionId });
      return;
    }
    const existing = cart.items.find((i: { product: mongoose.Types.ObjectId; quantity: number }) => i.product.toString() === productId);
    const currentQty = existing?.quantity ?? 0;
    if (newQty === currentQty) {
      recordSiteActivitySnapshot(req as AuthRequest, "cart");
      const populated = (await Cart.findById(cart._id).populate("items.product").lean()) as { items: PopulatedItem[] } | null;
      return res.json({ items: mapCartToItems(populated), sessionId });
    }
    const productObjId = new mongoose.Types.ObjectId(productId);
    let inv = await Inventory.findOne({ product: productObjId });
    if (!inv) {
      inv = await Inventory.create({ product: productObjId, quantity: 0 });
    }
    if (newQty === 0) {
      if (existing) {
        const oldQty = inv.quantity;
        inv.quantity = oldQty + existing.quantity;
        await inv.save();
        await InventoryLog.create({
          product: productObjId,
          quantityBefore: oldQty,
          quantityAfter: inv.quantity,
          change: existing.quantity,
          reason: "cart_remove",
        });
      }
      cart.items = cart.items.filter((i: { product: mongoose.Types.ObjectId; quantity: number }) => i.product.toString() !== productId);
    } else if (newQty < currentQty) {
      const restore = currentQty - newQty;
      existing!.quantity = newQty;
      const oldQty = inv.quantity;
      inv.quantity = oldQty + restore;
      await inv.save();
      await InventoryLog.create({
        product: productObjId,
        quantityBefore: oldQty,
        quantityAfter: inv.quantity,
        change: restore,
        reason: "cart_remove",
      });
    } else {
      const addQty = newQty - currentQty;
      if (inv.quantity < addQty) {
        res.status(409).json({ error: "Insufficient inventory" });
        return;
      }
      if (existing) {
        existing.quantity = newQty;
      } else {
        cart.items.push({ product: productObjId, quantity: newQty });
      }
      const oldQty = inv.quantity;
      inv.quantity = oldQty - addQty;
      await inv.save();
      await InventoryLog.create({
        product: productObjId,
        quantityBefore: oldQty,
        quantityAfter: inv.quantity,
        change: -addQty,
        reason: "cart_add",
      });
    }
    cart.lastActivityAt = new Date();
    await cart.save();
    if (cart.items.length > 0) {
      await updateCartVisitorMeta(cart._id, req);
    }
    recordSiteActivitySnapshot(req as AuthRequest, "cart");
    const populated = (await Cart.findById(cart._id).populate("items.product").lean()) as { items: PopulatedItem[] } | null;
    res.json({ items: mapCartToItems(populated), sessionId });
  } catch {
    res.status(500).json({ error: "Failed to update cart" });
  }
});

cartRouter.post("/clear", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.json({ items: [], sessionId: null });
    return;
  }
  try {
    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      recordSiteActivitySnapshot(req as AuthRequest, "cart");
      res.json({ items: [], sessionId });
      return;
    }
    for (const item of cart.items) {
      let inv = await Inventory.findOne({ product: item.product });
      if (!inv) {
        inv = await Inventory.create({ product: item.product, quantity: 0 });
      }
      const oldQty = inv.quantity;
      inv.quantity = oldQty + item.quantity;
      await inv.save();
      await InventoryLog.create({
        product: item.product,
        quantityBefore: oldQty,
        quantityAfter: inv.quantity,
        change: item.quantity,
        reason: "cart_remove",
      });
    }
    cart.items = [];
    cart.lastActivityAt = new Date();
    await cart.save();
    recordSiteActivitySnapshot(req as AuthRequest, "cart");
    res.json({ items: [], sessionId });
  } catch {
    res.status(500).json({ error: "Failed to clear cart" });
  }
});
