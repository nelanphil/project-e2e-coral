import { Router } from "express";
import Stripe from "stripe";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { getFloridaTaxRate } from "../services/florida-tax.js";
import * as shipping from "../services/shipping.js";
import {
  ShippingSettings,
  type IShippingSettings,
} from "../models/ShippingSettings.js";
import { RewardsSettings } from "../models/RewardsSettings.js";
import { Discount, type IDiscount } from "../models/Discount.js";
import { validatePostalCodeMatchesState } from "../lib/address-validation.js";
import { getVisitorMeta, enrichWithGeo } from "../lib/visitor-meta.js";
import { generateOrderNumber } from "../lib/order-number.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const getSessionId = (req: {
  headers: Record<string, string | string[] | undefined>;
}) => {
  const id = req.headers["x-cart-session"];
  const s = Array.isArray(id) ? id[0] : id;
  return typeof s === "string" && s.trim() ? s.trim() : null;
};

const getCookieId = (req: {
  headers: Record<string, string | string[] | undefined>;
}) => {
  const id = req.headers["x-cookie-id"];
  const s = Array.isArray(id) ? id[0] : id;
  return typeof s === "string" && s.trim() ? s.trim() : null;
};

function getIpAddress(req: {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
}) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.socket.remoteAddress;
}

function getUserAgent(req: {
  headers: Record<string, string | string[] | undefined>;
}) {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

type CheckoutAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function hasRequiredAddressFields(
  address?: Partial<CheckoutAddress> | null,
): address is CheckoutAddress {
  return !!(
    address?.line1 &&
    address.city &&
    address.state &&
    address.postalCode &&
    address.country
  );
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
    shippingAddress?: CheckoutAddress;
  };
  if (!hasRequiredAddressFields(shippingAddress)) {
    res.status(400).json({ error: "Valid shipping address required" });
    return;
  }

  const addressValidation = validatePostalCodeMatchesState(
    shippingAddress.postalCode,
    shippingAddress.state,
    shippingAddress.country,
  );
  if (!addressValidation.valid) {
    res.status(400).json({
      error: addressValidation.message ?? "Postal code does not match state",
    });
    return;
  }

  const state = shippingAddress.state?.toUpperCase().trim();

  if (state === "AK" || state === "ALASKA" || state === "HI" || state === "HAWAII") {
    res.status(400).json({
      error: "We do not ship to Hawaii or Alaska. Please use a continental US shipping address.",
    });
    return;
  }

  const flatSettings =
    await ShippingSettings.findOne().lean<IShippingSettings | null>();

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
            servicelevel: {
              name: state === "FL" ? "Florida Shipping" : "Standard Shipping",
            },
            amount: (flatCents / 100).toFixed(2),
            durationTerms: undefined,
          },
        ],
      });
      return;
    }
  }

  const cart = await Cart.findOne({ sessionId }).populate("items.product");
  const itemCount =
    cart?.items?.reduce(
      (sum: number, i: { quantity?: number }) => sum + (i.quantity ?? 0),
      0,
    ) ?? 1;
  const weightLbs = Math.max(1, Math.min(itemCount, 70));
  const { rates } = await shipping.getRates({
    addressTo: shippingAddress,
    weightLbs,
  });
  res.json({ rates });
});

checkoutRouter.post("/create", optionalAuth, async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).json({ error: "Cart session required" });
    return;
  }
  const {
    paymentMethod,
    successUrl,
    cancelUrl,
    shippingAddress,
    billingAddress,
    shippingAmount,
    email,
    pointsToApply,
    discountCode,
  } = req.body as {
    paymentMethod?: "stripe" | "paypal";
    successUrl?: string;
    cancelUrl?: string;
    shippingAddress?: CheckoutAddress;
    billingAddress?: CheckoutAddress;
    shippingAmount?: number;
    email?: string;
    pointsToApply?: number;
    discountCode?: string;
  };

  if (!hasRequiredAddressFields(shippingAddress)) {
    res.status(400).json({ error: "Valid shipping address required" });
    return;
  }

  const addressValidation = validatePostalCodeMatchesState(
    shippingAddress.postalCode,
    shippingAddress.state,
    shippingAddress.country,
  );
  if (!addressValidation.valid) {
    res.status(400).json({
      error: addressValidation.message ?? "Postal code does not match state",
    });
    return;
  }

  const shippingStateNorm = shippingAddress.state?.toUpperCase().trim();
  if (
    shippingStateNorm === "AK" ||
    shippingStateNorm === "ALASKA" ||
    shippingStateNorm === "HI" ||
    shippingStateNorm === "HAWAII"
  ) {
    res.status(400).json({
      error: "We do not ship to Hawaii or Alaska. Please use a continental US shipping address.",
    });
    return;
  }

  if (billingAddress) {
    if (!hasRequiredAddressFields(billingAddress)) {
      res.status(400).json({ error: "Valid billing address required" });
      return;
    }

    const billingAddressValidation = validatePostalCodeMatchesState(
      billingAddress.postalCode,
      billingAddress.state,
      billingAddress.country,
    );
    if (!billingAddressValidation.valid) {
      res.status(400).json({
        error:
          billingAddressValidation.message ??
          "Billing postal code does not match state",
      });
      return;
    }
  }

  const cart = await Cart.findOne({ sessionId }).populate("items.product");
  if (!cart || !cart.items.length) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const lineItems: { product: unknown; quantity: number; price: number }[] = [];
  const stripeLineItems: {
    price_data: {
      currency: string;
      product_data: { name: string };
      unit_amount: number;
    };
    quantity: number;
  }[] = [];
  for (const item of cart.items) {
    const product = item.product as {
      _id: string;
      price: number;
      name?: string;
    } | null;
    if (!product) continue;
    lineItems.push({
      product: product._id,
      quantity: item.quantity,
      price: product.price,
    });
    stripeLineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: product.name ?? "Coral" },
        unit_amount: Math.round(product.price),
      },
      quantity: item.quantity,
    });
  }
  if (lineItems.length === 0) {
    res.status(400).json({ error: "No valid items in cart" });
    return;
  }

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0,
  );
  const taxResult = getFloridaTaxRate({
    state: shippingAddress.state,
    postalCode: shippingAddress.postalCode,
  });
  const taxAmount =
    taxResult.rate > 0 ? Math.round(subtotal * taxResult.rate) : 0;

  const shipAmount =
    typeof shippingAmount === "number" && shippingAmount >= 0
      ? shippingAmount
      : 0;

  // ─── Discount code validation & calculation ────────────────────────────────
  let discountAmountCents = 0;
  let appliedDiscountCode: string | undefined;
  let appliedDiscountType: "product" | "shipping" | undefined;
  let discountDoc: (IDiscount & { _id: unknown }) | null;

  if (discountCode && typeof discountCode === "string") {
    discountDoc = (await Discount.findOne({
      code: discountCode.toUpperCase().trim(),
    })) as (IDiscount & { _id: unknown }) | null;
    if (!discountDoc || !discountDoc.isActive) {
      res.status(400).json({ error: "Invalid or inactive discount code" });
      return;
    }
    const now = new Date();
    if (discountDoc.startDate && now < discountDoc.startDate) {
      res.status(400).json({ error: "This discount code is not yet active" });
      return;
    }
    if (discountDoc.expiresAt && now > discountDoc.expiresAt) {
      res.status(400).json({ error: "This discount code has expired" });
      return;
    }
    if (
      discountDoc.maxUsesTotal > 0 &&
      discountDoc.usedCount >= discountDoc.maxUsesTotal
    ) {
      res
        .status(400)
        .json({ error: "This discount code has reached its usage limit" });
      return;
    }
    if (discountDoc.maxUsesPerUser > 0) {
      const uid = (req as AuthRequest).userId;
      const cid = getCookieId(req);
      const userFilter = [
        ...(uid ? [{ user: uid }] : []),
        ...(cid ? [{ cookieId: cid }] : []),
      ];
      if (userFilter.length > 0) {
        const userUses = await Order.countDocuments({
          discountCode: discountDoc.code,
          status: { $in: ["processing", "shipped", "delivered"] },
          $or: userFilter,
        });
        if (userUses >= discountDoc.maxUsesPerUser) {
          res.status(400).json({
            error:
              "You have already used this discount code the maximum number of times",
          });
          return;
        }
      }
    }
    // First order only check
    if (discountDoc.firstOrderOnly) {
      const uid = (req as AuthRequest).userId;
      const cid = getCookieId(req);
      const hasPriorOrder = await Order.exists({
        status: { $in: ["processing", "shipped", "delivered"] },
        $or: [
          ...(uid ? [{ user: uid }] : []),
          ...(cid ? [{ cookieId: cid }] : []),
        ],
      });
      if (hasPriorOrder) {
        res.status(400).json({
          error: "This discount code is only valid for first-time orders",
        });
        return;
      }
    }
    if (discountDoc.minOrderCents > 0 && subtotal < discountDoc.minOrderCents) {
      res.status(400).json({
        error: `Minimum order of $${(discountDoc.minOrderCents / 100).toFixed(2)} required`,
      });
      return;
    }

    appliedDiscountCode = discountDoc.code;
    appliedDiscountType = discountDoc.discountType;

    if (discountDoc.discountType === "product") {
      let qualifyingSubtotal = subtotal;
      if (discountDoc.applicableProducts.length > 0) {
        const applicableIds = new Set(
          discountDoc.applicableProducts.map((id) => id.toString()),
        );
        qualifyingSubtotal = lineItems
          .filter((li) => applicableIds.has(String(li.product)))
          .reduce((sum, li) => sum + li.price * li.quantity, 0);
      }
      if (discountDoc.valueType === "fixed") {
        discountAmountCents = Math.min(
          discountDoc.valueCents,
          qualifyingSubtotal,
        );
      } else {
        discountAmountCents = Math.round(
          qualifyingSubtotal * (discountDoc.valuePercent / 100),
        );
        if (discountDoc.maxDiscountCents > 0) {
          discountAmountCents = Math.min(
            discountAmountCents,
            discountDoc.maxDiscountCents,
          );
        }
      }
      discountAmountCents = Math.min(discountAmountCents, qualifyingSubtotal);
    } else if (discountDoc.discountType === "shipping") {
      if (discountDoc.valueType === "fixed") {
        discountAmountCents = Math.min(discountDoc.valueCents, shipAmount);
      } else {
        discountAmountCents = Math.round(
          shipAmount * (discountDoc.valuePercent / 100),
        );
        if (discountDoc.maxDiscountCents > 0) {
          discountAmountCents = Math.min(
            discountAmountCents,
            discountDoc.maxDiscountCents,
          );
        }
      }
      discountAmountCents = Math.min(discountAmountCents, shipAmount);
    }
  }

  // ─── Global free-shipping threshold ────────────────────────────────────────
  let freeShippingApplied = false;
  const shippingSettings = (await ShippingSettings.findOne().lean()) as {
    freeShippingThresholdCents?: number;
  } | null;
  const freeShipThreshold = shippingSettings?.freeShippingThresholdCents ?? 0;
  if (
    freeShipThreshold > 0 &&
    subtotal >= freeShipThreshold &&
    appliedDiscountType !== "shipping"
  ) {
    // Auto free shipping — override shipping to 0
    freeShippingApplied = true;
  }

  const effectiveShipAmount = freeShippingApplied
    ? 0
    : appliedDiscountType === "shipping"
      ? Math.max(0, shipAmount - discountAmountCents)
      : shipAmount;
  const effectiveSubtotal =
    appliedDiscountType === "product"
      ? Math.max(0, subtotal - discountAmountCents)
      : subtotal;

  const orderTotalCents = effectiveSubtotal + effectiveShipAmount + taxAmount;

  let pointsApplied = 0;
  let pointsDiscountCents = 0;

  const pointsToUse =
    typeof pointsToApply === "number" && pointsToApply > 0
      ? Math.round(pointsToApply)
      : 0;
  if (pointsToUse > 0) {
    const userIdForPoints = (req as AuthRequest).userId;
    if (!userIdForPoints) {
      res.status(400).json({ error: "Sign in to use rewards points" });
      return;
    }
    const [rewardsSettings, user] = await Promise.all([
      RewardsSettings.findOne().lean() as Promise<{
        pointsToCents?: number;
      } | null>,
      User.findById(userIdForPoints).select("pointsBalance").lean() as Promise<{
        pointsBalance?: number;
      } | null>,
    ]);
    const pointsToCents = rewardsSettings?.pointsToCents ?? 100;
    const userBalance = user?.pointsBalance ?? 0;
    const maxRedeemableByTotal = Math.floor(
      orderTotalCents / (pointsToCents / 100),
    );
    const maxRedeemable = Math.min(userBalance, maxRedeemableByTotal);
    if (pointsToUse > maxRedeemable) {
      res
        .status(400)
        .json({ error: `You can apply at most ${maxRedeemable} points` });
      return;
    }
    pointsApplied = pointsToUse;
    pointsDiscountCents = Math.floor(pointsToUse * (100 / pointsToCents));
  }

  // Build Stripe line items — all unit_amount values must be non-negative integers
  const finalStripeLineItems = [...stripeLineItems];
  // Shipping at effective rate (already accounts for free-shipping & shipping discounts)
  if (effectiveShipAmount > 0) {
    finalStripeLineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping" },
        unit_amount: Math.round(effectiveShipAmount),
      },
      quantity: 1,
    });
  }
  if (taxAmount > 0) {
    finalStripeLineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Florida Sales Tax" },
        unit_amount: Math.round(taxAmount),
      },
      quantity: 1,
    });
  }
  // Product discounts + rewards are applied via a Stripe coupon (negative line items are not allowed)
  const stripeCouponCents =
    (appliedDiscountType === "product" ? discountAmountCents : 0) +
    pointsDiscountCents;

  // Determine user for order
  let userId: string | undefined = (req as AuthRequest).userId;

  // If no authenticated user, try to find or create guest user
  if (!userId) {
    const cookieId = getCookieId(req);
    if (cookieId) {
      const ipAddress = getIpAddress(req);
      const userAgent = getUserAgent(req);
      const normalizedEmail =
        email && typeof email === "string" ? email.trim().toLowerCase() : undefined;
      let guestUser = await User.findOne({ cookieId, role: "guest" });

      if (guestUser) {
        // If an email is present, first see if it already belongs to another user.
        // In that case, just associate this order with the existing user instead of
        // trying to assign the email to the guest record (which would violate the unique index).
        if (normalizedEmail) {
          const existingUser = await User.findOne({ email: normalizedEmail });
          if (existingUser && !existingUser._id.equals(guestUser._id)) {
            userId = existingUser._id.toString();
          }
        }

        if (!userId) {
          // Update existing guest user (only set email when it doesn't conflict)
          const update: Record<string, unknown> = {
            $inc: { visitCount: 1 },
            lastVisit: new Date(),
            ipAddress,
            userAgent,
          };
          if (normalizedEmail) {
            update["email"] = normalizedEmail;
          }

          try {
            await User.findByIdAndUpdate(guestUser._id, update);
            userId = guestUser._id.toString();
          } catch (err: unknown) {
            if (
              typeof err === "object" &&
              err !== null &&
              "code" in err &&
              (err as { code: number }).code === 11000 &&
              normalizedEmail
            ) {
              // Unique email conflict on update — fall back to the existing user with this email
              const existingUser = await User.findOne({ email: normalizedEmail });
              if (existingUser) {
                userId = existingUser._id.toString();
              }
            } else {
              throw err;
            }
          }
        }
      } else {
        // Create new guest user
        try {
          guestUser = await User.create({
            cookieId,
            role: "guest",
            name: "",
            ipAddress,
            userAgent,
            visitCount: 1,
            lastVisit: new Date(),
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
          });
          userId = guestUser._id.toString();
        } catch (err: unknown) {
          if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code: number }).code === 11000 &&
            normalizedEmail
          ) {
            // Email already exists — look up the existing user instead
            const existingUser = await User.findOne({
              email: normalizedEmail,
            });
            if (existingUser) {
              userId = existingUser._id.toString();
            }
          } else {
            throw err;
          }
        }
      }
    }
  }

  const visitorMeta = getVisitorMeta(req);

  let order = await Order.findOne({
    cartSessionId: sessionId,
    status: "pending",
  });
  if (order) {
    const update: Record<string, unknown> = {
      lineItems,
      shippingAddress,
      ...(billingAddress ? { billingAddress } : {}),
      ...visitorMeta,
    };
    if (userId) update.user = userId;
    if (email && typeof email === "string")
      update.email = email.trim().toLowerCase();
    if (taxAmount > 0) update.taxAmount = taxAmount;
    if (shipAmount > 0) update.shippingAmount = shipAmount;
    if (pointsApplied > 0) {
      update.pointsApplied = pointsApplied;
      update.pointsDiscountCents = pointsDiscountCents;
    }
    if (appliedDiscountCode) {
      update.discountCode = appliedDiscountCode;
      update.discountAmountCents = discountAmountCents;
      update.discountType = appliedDiscountType;
    }
    // Generate orderNumber if not yet assigned
    if (!order.orderNumber) {
      update.orderNumber = await generateOrderNumber();
    }
    await Order.updateOne({ _id: order._id }, { $set: update });
  } else {
    const orderNumber = await generateOrderNumber();
    order = await Order.create({
      orderNumber,
      user: userId || undefined,
      email:
        email && typeof email === "string"
          ? email.trim().toLowerCase()
          : undefined,
      cartSessionId: sessionId,
      lineItems,
      shippingAddress,
      ...(billingAddress ? { billingAddress } : {}),
      status: "pending",
      paymentStatus: "unpaid",
      ...(taxAmount > 0 ? { taxAmount } : {}),
      ...(shipAmount > 0 ? { shippingAmount: shipAmount } : {}),
      ...(pointsApplied > 0 ? { pointsApplied, pointsDiscountCents } : {}),
      ...(appliedDiscountCode
        ? {
            discountCode: appliedDiscountCode,
            discountAmountCents,
            discountType: appliedDiscountType,
          }
        : {}),
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
      const baseSuccessUrl =
        successUrl ??
        `${process.env.CLIENT_ORIGIN ?? "http://localhost:3003"}/checkout/success`;
      const finalSuccessUrl = `${baseSuccessUrl}?orderId=${order._id}`;
      // Create a one-time Stripe coupon for product discounts + rewards
      let discountsParam:
        | Stripe.Checkout.SessionCreateParams.Discount[]
        | undefined;
      if (stripeCouponCents > 0) {
        const couponLabel = [
          appliedDiscountCode ? `Discount (${appliedDiscountCode})` : "",
          pointsDiscountCents > 0 ? "Rewards" : "",
        ]
          .filter(Boolean)
          .join(" + ");
        const coupon = await stripe.coupons.create({
          amount_off: stripeCouponCents,
          currency: "usd",
          duration: "once",
          name: couponLabel || "Discount",
        });
        discountsParam = [{ coupon: coupon.id }];
      }
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: finalStripeLineItems,
        ...(discountsParam ? { discounts: discountsParam } : {}),
        success_url: finalSuccessUrl,
        cancel_url:
          cancelUrl ??
          `${process.env.CLIENT_ORIGIN ?? "http://localhost:3003"}/cart`,
        customer_email: email && typeof email === "string" ? email : undefined,
        metadata: { orderId: order._id.toString() },
      });
      await Order.updateOne(
        { _id: order._id },
        { stripeCheckoutSessionId: session.id },
      );
      res.json({ stripeUrl: session.url, orderId: order._id });
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Stripe checkout failed" });
      return;
    }
  }

  if (paymentMethod === "paypal") {
    res.status(501).json({
      error: "PayPal not configured yet. Use Stripe for now.",
      orderId: order._id,
    });
    return;
  }

  res.status(400).json({
    error: "Choose paymentMethod: stripe or paypal",
    orderId: order._id,
  });
});
