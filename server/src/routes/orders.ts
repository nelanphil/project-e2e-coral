import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth.js";
import type { IOrder } from "../models/Order.js";
import { Order } from "../models/Order.js";
import * as shipping from "../services/shipping.js";

export const ordersRouter = Router();

ordersRouter.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
  res.json({ orders });
});

ordersRouter.get("/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const order = (await Order.findById(req.params.id).populate("lineItems.product").lean()) as IOrder | null;
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const orderUserId = order.user != null ? String(order.user) : null;
  if (orderUserId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(order);
});

ordersRouter.get("/:id/rates", requireAuth, requireAdmin, async (req, res) => {
  const order = (await Order.findById(req.params.id).lean()) as IOrder | null;
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { rates } = await shipping.getRates({ addressTo: order.shippingAddress });
  res.json({ rates });
});

ordersRouter.post("/:id/ship", requireAuth, requireAdmin, async (req, res) => {
  const { rateId } = req.body as { rateId?: string };
  if (!rateId) {
    res.status(400).json({ error: "rateId required" });
    return;
  }
  const order = await Order.findById(req.params.id).lean() as IOrder | null;
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = await shipping.createShipment({ addressTo: order.shippingAddress, rateId });
  if (!result) {
    res.status(500).json({ error: "Failed to create shipment" });
    return;
  }
  await Order.updateOne(
    { _id: req.params.id },
    { trackingNumber: result.trackingNumber, status: "shipped" }
  );
  res.json({ trackingNumber: result.trackingNumber, labelUrl: result.labelUrl });
});
