import { Router } from "express";
import mongoose from "mongoose";
import Stripe from "stripe";
import {
  requireAuth,
  requireAdmin,
  type AuthRequest,
} from "../middleware/auth.js";
import type { IOrder } from "../models/Order.js";
import { Order } from "../models/Order.js";
import * as shipping from "../services/shipping.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

/**
 * Verify payment status with Stripe for orders that still appear unpaid.
 * If the Stripe checkout session shows payment was collected, update the order.
 */
export async function verifyStripePayment(orderId: string): Promise<void> {
  if (!stripe) return;
  const order = await Order.findById(orderId);
  if (!order) return;
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded")
    return;
  if (!order.stripeCheckoutSessionId) return;

  try {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeCheckoutSessionId,
    );
    if (session.payment_status === "paid") {
      order.status = order.status === "pending" ? "processing" : order.status;
      (order as any).paymentStatus = "paid";
      if (session.payment_intent) {
        order.stripePaymentIntentId = String(session.payment_intent);
      }
      await order.save();
    }
  } catch (err) {
    console.error(`Failed to verify Stripe session for order ${orderId}:`, err);
  }
}

export const ordersRouter = Router();

ordersRouter.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ orders });
});

ordersRouter.get("/confirmation/:orderId", async (req, res) => {
  // Verify payment with Stripe before returning order data
  await verifyStripePayment(req.params.orderId);

  const order = await Order.findById(req.params.orderId)
    .populate("lineItems.product", "name slug images")
    .lean();
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(order);
});

ordersRouter.get("/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const order = (await Order.findById(req.params.id)
    .populate("lineItems.product")
    .lean()) as IOrder | null;
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
  const { rates } = await shipping.getRates({
    addressTo: order.shippingAddress,
  });
  res.json({ rates });
});

ordersRouter.post("/:id/ship", requireAuth, requireAdmin, async (req, res) => {
  const { rateId } = req.body as { rateId?: string };
  if (!rateId) {
    res.status(400).json({ error: "rateId required" });
    return;
  }
  const order = (await Order.findById(req.params.id).lean()) as IOrder | null;
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = await shipping.createShipment({
    addressTo: order.shippingAddress,
    rateId,
  });
  if (!result) {
    res.status(500).json({ error: "Failed to create shipment" });
    return;
  }
  await Order.updateOne(
    { _id: req.params.id },
    { trackingNumber: result.trackingNumber, status: "shipped" },
  );
  res.json({
    trackingNumber: result.trackingNumber,
    labelUrl: result.labelUrl,
  });
});
