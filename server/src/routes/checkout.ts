import { Router } from "express";
import Stripe from "stripe";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { getFloridaTaxRate } from "../services/florida-tax.js";
import * as shipping from "../services/shipping.js";
import { ShippingSettings } from "../models/ShippingSettings.js";
import { RewardsSettings } from "../models/RewardsSettings.js";
import { validatePostalCodeMatchesState } from "../lib/address-validation.js";
import { getVisitorMeta, enrichWithGeo } from "../lib/visitor-meta.js";

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

/** POST /api/checkout/tax-estimate - Get Florida tax estimate for address + subtotal */
checkoutRouter.post("/tax-estimate", (req, res) => {
  const { state, postalCode, subtotal } = req.body as {
    state?: string;
    postalCode?: string;
    subtotal?: number;
  };
  const result = getFloridaTaxRate({ state, postalCode });
  const sub = typeof subtotal === "number" && subtotal >= 0 ? subtotal : 0;
  const amount = Math.round(sub * result.rate);
  res.json({
    rate: result.rate,
    amount,
    county: result.county,
    source: result.source,
  });
});

/** POST /api/checkout/shipping-rates - Get shipping rates for address */
checkoutRouter.post("/shipping-rates", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).json({ error: "Cart session required" });
    return;
  }
  const { shippingAddress } = req.body as {
    shippingAddress?: { line1: string; line2?: string; city: string; state: string; postalCode: string; country: string };
  };
  if (!shippingAddress?.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.country) {
    res.status(400).json({ error: "Valid shipping address required" });
    return;
  }

  const addressValidation = validatePostalCodeMatchesState(
    shippingAddress.postalCode,
    shippingAddress.state,
    shippingAddress.country
  );
  if (!addressValidation.valid) {
    res.status(400).json({ error: addressValidation.message ?? "Postal code does not match state" });
    return;
  }

  const state = shippingAddress.state?.toUpperCase().trim();
  const flatSettings = await ShippingSettings.findOne().lean();

  if (flatSettings) {
    const floridaCents = flatSettings.shippingAmountFlorida ?? 0;
    const otherCents = flatSettings.shippingAmountOther ?? 0;
    const useFlat = state === "FL" ? floridaCents > 0 : otherCents > 0;
    const flatCents = state === "FL" ? floridaCents : otherCents;

    if (useFlat && flatCents > 0) {
      res.json({
        rates: [
          {
            objectId: "flat-rate",
            provider: "Store",
            servicelevel: { name: state === "FL" ? "Florida Shipping" : "Standard Shipping" },
            amount: (flatCents / 100).toFixed(2),
            durationTerms: undefined,
          },
        ],
      });
      return;
    }
  }

  const cart = await Cart.findOne({ sessionId }).populate("items.product");
  const itemCount = cart?.items?.reduce((sum: number, i: { quantity?: number }) => sum + (i.quantity ?? 0), 0) ?? 1;
  const weightLbs = Math.max(1, Math.min(itemCount, 70));
  const { rates } = await shipping.getRates({ addressTo: shippingAddress, weightLbs });
  res.json({ rates });
});

checkoutRouter.post("/create", optionalAuth, async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).json({ error: "Cart session required" });
    return;
  }
  const { paymentMethod, successUrl, cancelUrl, shippingAddress, shippingAmount, email, pointsToApply } = req.body as {
    paymentMethod?: "stripe" | "paypal";
    successUrl?: string;
    cancelUrl?: string;
    shippingAddress?: { line1: string; line2?: string; city: string; state: string; postalCode: string; country: string };
    shippingAmount?: number;
    email?: string;
    pointsToApply?: number;
  };

  if (!shippingAddress?.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.country) {
    res.status(400).json({ error: "Valid shipping address required" });
    return;
  }

  const addressValidation = validatePostalCodeMatchesState(
    shippingAddress.postalCode,
    shippingAddress.state,
    shippingAddress.country
  );
  if (!addressValidation.valid) {
    res.status(400).json({ error: addressValidation.message ?? "Postal code does not match state" });
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

  const subtotal = lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0);
  const taxResult = getFloridaTaxRate({
    state: shippingAddress.state,
    postalCode: shippingAddress.postalCode,
  });
  const taxAmount = taxResult.rate > 0 ? Math.round(subtotal * taxResult.rate) : 0;

  const shipAmount = typeof shippingAmount === "number" && shippingAmount >= 0 ? shippingAmount : 0;
  const orderTotalCents = subtotal + shipAmount + taxAmount;

  let pointsApplied = 0;
  let pointsDiscountCents = 0;

  const pointsToUse = typeof pointsToApply === "number" && pointsToApply > 0 ? Math.round(pointsToApply) : 0;
  if (pointsToUse > 0) {
    const userIdForPoints = (req as AuthRequest).userId;
    if (!userIdForPoints) {
      res.status(400).json({ error: "Sign in to use rewards points" });
      return;
    }
    const [rewardsSettings, user] = await Promise.all([
      RewardsSettings.findOne().lean() as Promise<{ pointsToCents?: number } | null>,
      User.findById(userIdForPoints).select("pointsBalance").lean() as Promise<{ pointsBalance?: number } | null>,
    ]);
    const pointsToCents = rewardsSettings?.pointsToCents ?? 100;
    const userBalance = user?.pointsBalance ?? 0;
    const maxRedeemableByTotal = Math.floor(orderTotalCents / (pointsToCents / 100));
    const maxRedeemable = Math.min(userBalance, maxRedeemableByTotal);
    if (pointsToUse > maxRedeemable) {
      res.status(400).json({ error: `You can apply at most ${maxRedeemable} points` });
      return;
    }
    pointsApplied = pointsToUse;
    pointsDiscountCents = Math.floor(pointsToUse * (100 / pointsToCents));
  }

  const finalStripeLineItems = [...stripeLineItems];
  if (shipAmount > 0) {
    finalStripeLineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping" },
        unit_amount: shipAmount,
      },
      quantity: 1,
    });
  }
  if (taxAmount > 0) {
    finalStripeLineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Florida Sales Tax" },
        unit_amount: taxAmount,
      },
      quantity: 1,
    });
  }
  if (pointsDiscountCents > 0) {
    finalStripeLineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Rewards discount" },
        unit_amount: -pointsDiscountCents,
      },
      quantity: 1,
    });
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
          ...(email && typeof email === "string" ? { email } : {}),
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
          ...(email && typeof email === "string" ? { email } : {}),
        });
        userId = guestUser._id.toString();
      }
    }
  }

  const visitorMeta = getVisitorMeta(req);

  let order = await Order.findOne({ cartSessionId: sessionId, status: "pending" });
  if (order) {
    const update: Record<string, unknown> = {
      lineItems,
      shippingAddress,
      ...visitorMeta,
    };
    if (userId) update.user = userId;
    if (taxAmount > 0) update.taxAmount = taxAmount;
    if (shipAmount > 0) update.shippingAmount = shipAmount;
    if (pointsApplied > 0) {
      update.pointsApplied = pointsApplied;
      update.pointsDiscountCents = pointsDiscountCents;
    }
    await Order.updateOne({ _id: order._id }, { $set: update });
  } else {
    order = await Order.create({
      user: userId || undefined,
      cartSessionId: sessionId,
      lineItems,
      shippingAddress,
      status: "pending",
      ...(taxAmount > 0 ? { taxAmount } : {}),
      ...(shipAmount > 0 ? { shippingAmount: shipAmount } : {}),
      ...(pointsApplied > 0 ? { pointsApplied, pointsDiscountCents } : {}),
      ...visitorMeta,
    });
  }

  if (visitorMeta.ipAddress) {
    enrichWithGeo(visitorMeta.ipAddress)
      .then((geo) => {
        if (Object.keys(geo).length > 0) {
          Order.updateOne({ _id: order._id }, { $set: geo }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  if (paymentMethod === "stripe" && stripe) {
    try {
      const baseSuccessUrl = successUrl ?? `${process.env.CLIENT_ORIGIN ?? "http://localhost:3003"}/checkout/success`;
      const finalSuccessUrl = `${baseSuccessUrl}?orderId=${order._id}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: finalStripeLineItems,
        success_url: finalSuccessUrl,
        cancel_url: cancelUrl ?? `${process.env.CLIENT_ORIGIN ?? "http://localhost:3003"}/cart`,
        customer_email: email && typeof email === "string" ? email : undefined,
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
