import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
  type AuthRequest,
} from "../middleware/auth.js";
import type { IOrder } from "../models/Order.js";
import { Order } from "../models/Order.js";
import { logOrderStatusChange } from "../lib/order-status-log.js";
import { sendOrderEmailsOnce } from "../services/email.js";
import * as shipping from "../services/shipping.js";
import { stripe } from "../lib/stripe.js";

/**
 * Verify payment status with Stripe for orders that still appear unpaid.
 * If the Stripe checkout session shows payment was collected, update the order.
 * Returns true if the order was updated to paid (caller may send emails).
 */
export async function verifyStripePayment(orderId: string): Promise<boolean> {
  if (!stripe) return false;
  const order = await Order.findById(orderId);
  if (!order) return false;
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded")
    return false;
  if (!order.stripeCheckoutSessionId) return false;

  try {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeCheckoutSessionId,
    );
    if (session.payment_status === "paid") {
      const statusBefore = order.status;
      order.status = order.status === "pending" ? "processing" : order.status;
      order.paymentStatus = "paid";
      if (session.payment_intent) {
        order.stripePaymentIntentId = String(session.payment_intent);
      }
      await order.save();
      await logOrderStatusChange({
        orderId,
        statusBefore,
        statusAfter: order.status,
        reason: "payment_verified",
      });
      return true;
    }
  } catch (err) {
    console.error(`Failed to verify Stripe session for order ${orderId}:`, err);
  }
  return false;
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
  const wasUpdated = await verifyStripePayment(req.params.orderId);
  // Send emails if we just verified payment (webhook may not have fired yet)
  if (wasUpdated) {
    sendOrderEmailsOnce(req.params.orderId).catch((err) =>
      console.error("Order emails failed", err),
    );
  }

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
  const performedBy = (req as AuthRequest).userId;
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
  await logOrderStatusChange({
    orderId: req.params.id,
    statusBefore: order.status,
    statusAfter: "shipped",
    reason: "shipping_label_created",
    performedBy,
  });
  res.json({
    trackingNumber: result.trackingNumber,
    labelUrl: result.labelUrl,
  });
});
