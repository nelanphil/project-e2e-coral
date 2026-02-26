import { Router } from "express";
import Stripe from "stripe";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const getSessionId = (req: { headers: Record<string, string | string[] | undefined> }) => {
  const id = req.headers["x-cart-session"];
  const s = Array.isArray(id) ? id[0] : id;
  return typeof s === "string" && s.trim() ? s.trim() : null;
};

const getCookieId = (req: { headers: Record<string, string | string[] | undefined> }) => {
  const id = req.headers["x-cookie-id"];
  const s = Array.isArray(id) ? id[0] : id;
  return typeof s === "string" && s.trim() ? s.trim() : null;
};

function getIpAddress(req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } }) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.socket.remoteAddress;
}

function getUserAgent(req: { headers: Record<string, string | string[] | undefined> }) {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

export const checkoutRouter = Router();

checkoutRouter.post("/create", optionalAuth, async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).json({ error: "Cart session required" });
    return;
  }
  const { paymentMethod, successUrl, cancelUrl, shippingAddress } = req.body as {
    paymentMethod?: "stripe" | "paypal";
    successUrl?: string;
    cancelUrl?: string;
    shippingAddress?: { line1: string; line2?: string; city: string; state: string; postalCode: string; country: string };
  };

  if (!shippingAddress?.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.country) {
    res.status(400).json({ error: "Valid shipping address required" });
    return;
  }

  const cart = await Cart.findOne({ sessionId }).populate("items.product");
  if (!cart || !cart.items.length) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const lineItems: { product: unknown; quantity: number; price: number }[] = [];
  const stripeLineItems: { price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }[] = [];
  for (const item of cart.items) {
    const product = item.product as { _id: string; price: number; name?: string } | null;
    if (!product) continue;
    lineItems.push({ product: product._id, quantity: item.quantity, price: product.price });
    stripeLineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: product.name ?? "Coral" },
        unit_amount: product.price,
      },
      quantity: item.quantity,
    });
  }
  if (lineItems.length === 0) {
    res.status(400).json({ error: "No valid items in cart" });
    return;
  }

  // Determine user for order
  let userId: string | undefined = (req as AuthRequest).userId;
  
  // If no authenticated user, try to find or create guest user
  if (!userId) {
    const cookieId = getCookieId(req);
    if (cookieId) {
      const ipAddress = getIpAddress(req);
      const userAgent = getUserAgent(req);
      let guestUser = await User.findOne({ cookieId, role: "guest" });
      
      if (guestUser) {
        // Update existing guest user
        await User.findByIdAndUpdate(guestUser._id, {
          $inc: { visitCount: 1 },
          lastVisit: new Date(),
          ipAddress,
          userAgent,
        });
        userId = guestUser._id.toString();
      } else {
        // Create new guest user
        guestUser = await User.create({
          cookieId,
          role: "guest",
          name: "",
          ipAddress,
          userAgent,
          visitCount: 1,
          lastVisit: new Date(),
        });
        userId = guestUser._id.toString();
      }
    }
  }

  const order = await Order.create({
    user: userId ? userId : undefined,
    lineItems,
    shippingAddress,
    status: "pending",
  });

  if (paymentMethod === "stripe" && stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: stripeLineItems,
        success_url: successUrl ?? `${process.env.CLIENT_ORIGIN ?? "http://localhost:3003"}/checkout/success`,
        cancel_url: cancelUrl ?? `${process.env.CLIENT_ORIGIN ?? "http://localhost:3003"}/cart`,
        metadata: { orderId: order._id.toString() },
      });
      await Order.updateOne({ _id: order._id }, { stripeCheckoutSessionId: session.id });
      res.json({ stripeUrl: session.url, orderId: order._id });
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Stripe checkout failed" });
      return;
    }
  }

  if (paymentMethod === "paypal") {
    res.status(501).json({ error: "PayPal not configured yet. Use Stripe for now.", orderId: order._id });
    return;
  }

  res.status(400).json({ error: "Choose paymentMethod: stripe or paypal", orderId: order._id });
});
