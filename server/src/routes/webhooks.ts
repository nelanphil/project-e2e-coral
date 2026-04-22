import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import type { IOrder } from "../models/Order.js";
import { User } from "../models/User.js";
import { RewardsSettings } from "../models/RewardsSettings.js";
import { RewardLog } from "../models/RewardLog.js";
import { Discount } from "../models/Discount.js";
import { processRefundReversals } from "../lib/order-refund.js";
import { logOrderStatusChange } from "../lib/order-status-log.js";
import { sendOrderEmailsOnce } from "../services/email.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe || !stripeWebhookSecret) {
    console.warn(
      "Stripe webhook received but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not configured. " +
        "Payment status will not be updated via webhooks.",
    );
    res.sendStatus(200);
    return;
  }
  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    res.status(400).send("Missing signature");
    return;
  }
  const rawBody = req.body as Buffer | undefined;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    res.status(400).send("Raw body required for webhook");
    return;
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
  } catch (err) {
    res
      .status(400)
      .send(`Webhook signature verification failed: ${(err as Error).message}`);
    return;
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      // Payment not yet collected (e.g. delayed payment method); wait for async_payment_succeeded
      res.sendStatus(200);
      return;
    }
    const orderId = session.metadata?.orderId;
    if (orderId) {
      console.log(`Stripe webhook: ${event.type} for orderId ${orderId}`);
      const order = await Order.findById(orderId);
      if (
        order &&
        (order.status === "pending" || order.status === "processing")
      ) {
        const statusBefore = order.status;
        order.status = "processing";
        order.paymentStatus = "paid";
        if (session.payment_intent)
          order.stripePaymentIntentId = String(session.payment_intent);
        await order.save();

        await logOrderStatusChange({
          orderId: order._id,
          statusBefore,
          statusAfter: order.status,
          reason: "stripe_payment_received",
        });

        const userId = order.user?.toString();
        const pointsApplied = order.pointsApplied ?? 0;
        const pointsDiscountCents = order.pointsDiscountCents ?? 0;

        if (userId && pointsApplied > 0) {
          await User.findByIdAndUpdate(userId, {
            $inc: { pointsBalance: -pointsApplied },
          });
          await RewardLog.create({
            user: userId,
            type: "spent",
            points: -pointsApplied,
            order: order._id,
            description: `Order #${orderId.toString().slice(-6).toUpperCase()}`,
          });
        }

        const rewardsSettings = (await RewardsSettings.findOne().lean()) as {
          pointsPerDollar?: number;
        } | null;
        const pointsPerDollar = rewardsSettings?.pointsPerDollar ?? 10;
        if (userId && pointsPerDollar > 0) {
          const subtotal = order.lineItems.reduce(
            (sum: number, li: { price: number; quantity: number }) =>
              sum + li.price * li.quantity,
            0,
          );
          const discountCents = order.discountAmountCents ?? 0;
          const orderTotalCents =
            subtotal +
            (order.shippingAmount ?? 0) +
            (order.taxAmount ?? 0) -
            pointsDiscountCents -
            discountCents;
          const pointsEarned = Math.floor(
            (orderTotalCents / 100) * pointsPerDollar,
          );
          if (pointsEarned > 0) {
            await User.findByIdAndUpdate(userId, {
              $inc: { pointsBalance: pointsEarned },
            });
            await RewardLog.create({
              user: userId,
              type: "earned",
              points: pointsEarned,
              order: order._id,
              description: `Order #${orderId.toString().slice(-6).toUpperCase()}`,
            });
          }
        }

        // Track discount code usage
        if (order.discountCode) {
          const cookieId = order.cookieId;
          await Discount.findOneAndUpdate(
            { code: order.discountCode },
            {
              $inc: { usedCount: 1 },
              $push: {
                usageLog: {
                  userId: userId || undefined,
                  cookieId: cookieId || undefined,
                  orderId: order._id,
                  usedAt: new Date(),
                },
              },
            },
          );
        }

        sendOrderEmailsOnce(order._id.toString()).catch((err) =>
          console.error("Order emails failed", err),
        );
      }
    }
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (paymentIntentId) {
      const order = (await Order.findOne({
        stripePaymentIntentId: paymentIntentId,
      })) as IOrder | null;
      if (order && order.status !== "refunded") {
        const statusBefore = order.status;
        await Order.updateOne(
          { _id: order._id },
          { $set: { status: "refunded", paymentStatus: "refunded" } },
        );
        await logOrderStatusChange({
          orderId: order._id,
          statusBefore,
          statusAfter: "refunded",
          reason: "stripe_refund",
        });
        await processRefundReversals(order);
      }
    }
  }
  res.sendStatus(200);
}

export const webhooksRouter = Router();

webhooksRouter.post("/paypal", (_req, res) => {
  res.sendStatus(200);
});
