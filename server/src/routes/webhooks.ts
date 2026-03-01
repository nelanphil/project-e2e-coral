import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { RewardsSettings } from "../models/RewardsSettings.js";
import { RewardLog } from "../models/RewardLog.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe || !stripeWebhookSecret) {
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
    res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
    return;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order && order.status === "pending") {
        order.status = "paid";
        if (session.payment_intent) order.stripePaymentIntentId = String(session.payment_intent);
        await order.save();

        const userId = order.user?.toString();
        const pointsApplied = order.pointsApplied ?? 0;
        const pointsDiscountCents = order.pointsDiscountCents ?? 0;

        if (userId && pointsApplied > 0) {
          await User.findByIdAndUpdate(userId, { $inc: { pointsBalance: -pointsApplied } });
          await RewardLog.create({
            user: userId,
            type: "spent",
            points: -pointsApplied,
            order: order._id,
            description: `Order #${orderId.toString().slice(-6).toUpperCase()}`,
          });
        }

        const rewardsSettings = await RewardsSettings.findOne().lean() as { pointsPerDollar?: number } | null;
        const pointsPerDollar = rewardsSettings?.pointsPerDollar ?? 10;
        if (userId && pointsPerDollar > 0) {
          const subtotal = order.lineItems.reduce((sum: number, li: { price: number; quantity: number }) => sum + li.price * li.quantity, 0);
          const orderTotalCents = subtotal + (order.shippingAmount ?? 0) + (order.taxAmount ?? 0) - pointsDiscountCents;
          const pointsEarned = Math.floor((orderTotalCents / 100) * pointsPerDollar);
          if (pointsEarned > 0) {
            await User.findByIdAndUpdate(userId, { $inc: { pointsBalance: pointsEarned } });
            await RewardLog.create({
              user: userId,
              type: "earned",
              points: pointsEarned,
              order: order._id,
              description: `Order #${orderId.toString().slice(-6).toUpperCase()}`,
            });
          }
        }
      }
    }
  }
  res.sendStatus(200);
}

export const webhooksRouter = Router();

webhooksRouter.post("/paypal", (_req, res) => {
  res.sendStatus(200);
});
