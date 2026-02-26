import { Router } from "express";
import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";

export const cartRouter = Router();

function getSessionId(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const id = req.headers["x-cart-session"];
  const s = Array.isArray(id) ? id[0] : id;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

cartRouter.get("/", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.json({ items: [], sessionId: null });
    return;
  }
  try {
    const cart = await Cart.findOne({ sessionId }).populate("items.product").lean() as { items: { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number }[] } | null;
    if (!cart) {
      res.json({ items: cartItemsToResponse([]), sessionId });
      return;
    }
    const items = cart.items.map((i: { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number }) => ({
      productId: i.product?._id,
      name: i.product?.name,
      slug: i.product?.slug,
      price: i.product?.price,
      image: i.product?.images?.[0] ?? null,
      quantity: i.quantity,
    })).filter(Boolean);
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
    await cart.save();
    const populated = (await Cart.findById(cart._id).populate("items.product").lean()) as { items: { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number }[] } | null;
    const items = (populated?.items ?? []).map((i: { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number }) => ({
      productId: i.product?._id,
      name: i.product?.name,
      slug: i.product?.slug,
      price: i.product?.price,
      image: i.product?.images?.[0] ?? null,
      quantity: i.quantity,
    }));
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
      res.json({ items: [], sessionId });
      return;
    }
    cart.items = cart.items.filter((i: { product: mongoose.Types.ObjectId; quantity: number }) => i.product.toString() !== productId);
    await cart.save();
    const populated = await Cart.findById(cart._id).populate("items.product").lean() as { items: { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number }[] } | null;
    const items = (populated?.items ?? []).map((i: { product: { _id: string; name: string; slug: string; price: number; images?: string[] }; quantity: number }) => ({
      productId: i.product?._id,
      name: i.product?.name,
      slug: i.product?.slug,
      price: i.product?.price,
      image: i.product?.images?.[0] ?? null,
      quantity: i.quantity,
    }));
    res.json({ items, sessionId });
  } catch {
    res.status(500).json({ error: "Failed to update cart" });
  }
});
