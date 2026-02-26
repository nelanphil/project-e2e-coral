import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";

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
        for (const item of order.lineItems) {
          const inv = await Inventory.findOne({ product: item.product });
          if (inv) {
            const oldQty = inv.quantity;
            const newQty = oldQty - item.quantity;
            inv.quantity = newQty;
            await inv.save();
            await InventoryLog.create({
              product: item.product,
              quantityBefore: oldQty,
              quantityAfter: newQty,
              change: -item.quantity,
              reason: "sale",
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
