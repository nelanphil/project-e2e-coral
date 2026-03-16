import { Router } from "express";
import { Discount } from "../models/Discount.js";
import { Order } from "../models/Order.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";

const getCookieId = (req: {
  headers: Record<string, string | string[] | undefined>;
}) => {
  const id = req.headers["x-cookie-id"];
  const s = Array.isArray(id) ? id[0] : id;
  return typeof s === "string" && s.trim() ? s.trim() : null;
};

export const discountsRouter = Router();

/**
 * POST /api/discounts/validate
 * Public endpoint (optionalAuth) to validate a discount code and return the
 * computed discount amount. Used by the checkout UI before submitting.
 *
 * Body: { code, cartItems: [{ productId, quantity, price }], subtotalCents }
 */
discountsRouter.post("/validate", optionalAuth, async (req, res) => {
  try {
    const { code, cartItems, subtotalCents } = req.body as {
      code?: string;
      cartItems?: { productId: string; quantity: number; price: number }[];
      subtotalCents?: number;
    };

    if (!code || typeof code !== "string") {
      res
        .status(400)
        .json({ valid: false, message: "Discount code is required" });
      return;
    }

    const discount = await Discount.findOne({
      code: code.toUpperCase().trim(),
    });

    if (!discount) {
      res.status(404).json({ valid: false, message: "Invalid discount code" });
      return;
    }

    // Active check
    if (!discount.isActive) {
      res.status(400).json({
        valid: false,
        message: "This discount code is no longer active",
      });
      return;
    }

    // Date range checks
    const now = new Date();
    if (discount.startDate && now < discount.startDate) {
      res.status(400).json({
        valid: false,
        message: "This discount code is not yet active",
      });
      return;
    }
    if (discount.expiresAt && now > discount.expiresAt) {
      res
        .status(400)
        .json({ valid: false, message: "This discount code has expired" });
      return;
    }

    // Total usage limit
    if (
      discount.maxUsesTotal > 0 &&
      discount.usedCount >= discount.maxUsesTotal
    ) {
      res.status(400).json({
        valid: false,
        message: "This discount code has reached its usage limit",
      });
      return;
    }

    // Per-user usage limit — checked against paid orders, not usageLog,
    // so enforcement works even if the Stripe webhook hasn't fired yet.
    if (discount.maxUsesPerUser > 0) {
      const userId = (req as AuthRequest).userId;
      const cookieId = getCookieId(req);
      const userFilter = [
        ...(userId ? [{ user: userId }] : []),
        ...(cookieId ? [{ cookieId }] : []),
      ];
      if (userFilter.length > 0) {
        const userUsageCount = await Order.countDocuments({
          discountCode: discount.code,
          status: { $in: ["processing", "shipped", "delivered"] },
          $or: userFilter,
        });
        if (userUsageCount >= discount.maxUsesPerUser) {
          res.status(400).json({
            valid: false,
            message:
              "You have already used this discount code the maximum number of times",
          });
          return;
        }
      }
    }

    // First order only check
    if (discount.firstOrderOnly) {
      const userId = (req as AuthRequest).userId;
      const cookieId = getCookieId(req);
      const hasPriorOrder = await Order.exists({
        status: { $in: ["processing", "shipped", "delivered"] },
        $or: [
          ...(userId ? [{ user: userId }] : []),
          ...(cookieId ? [{ cookieId }] : []),
        ],
      });
      if (hasPriorOrder) {
        res.status(400).json({
          valid: false,
          message: "This discount code is only valid for first-time orders",
        });
        return;
      }
    }

    // Minimum order check
    const sub =
      typeof subtotalCents === "number" && subtotalCents >= 0
        ? subtotalCents
        : 0;
    if (discount.minOrderCents > 0 && sub < discount.minOrderCents) {
      res.status(400).json({
        valid: false,
        message: `Minimum order of $${(discount.minOrderCents / 100).toFixed(2)} required for this code`,
      });
      return;
    }

    // Calculate discount amount
    let discountAmountCents = 0;

    if (discount.discountType === "product") {
      // Determine qualifying subtotal
      let qualifyingSubtotal = sub;
      if (discount.applicableProducts.length > 0 && Array.isArray(cartItems)) {
        const applicableIds = new Set(
          discount.applicableProducts.map((id: { toString(): string }) =>
            id.toString(),
          ),
        );
        qualifyingSubtotal = cartItems
          .filter((item) => applicableIds.has(item.productId))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
      }

      if (discount.valueType === "fixed") {
        discountAmountCents = Math.min(discount.valueCents, qualifyingSubtotal);
      } else {
        discountAmountCents = Math.round(
          qualifyingSubtotal * (discount.valuePercent / 100),
        );
        // Apply max discount cap if set
        if (discount.maxDiscountCents > 0) {
          discountAmountCents = Math.min(
            discountAmountCents,
            discount.maxDiscountCents,
          );
        }
      }
      // Never discount more than the qualifying subtotal
      discountAmountCents = Math.min(discountAmountCents, qualifyingSubtotal);
    } else if (discount.discountType === "shipping") {
      // For shipping codes, return the value — actual application happens at checkout
      // when we know the shipping cost
      if (discount.valueType === "fixed") {
        discountAmountCents = discount.valueCents;
      } else {
        // Percentage of shipping — we return the percent; actual calc at checkout
        discountAmountCents = discount.valuePercent; // This is the percent, not cents
      }
    }

    res.json({
      valid: true,
      discountType: discount.discountType,
      valueType: discount.valueType,
      discountAmountCents,
      valueCents: discount.valueCents,
      valuePercent: discount.valuePercent,
      maxDiscountCents: discount.maxDiscountCents,
      message: "Discount code applied!",
    });
  } catch {
    res
      .status(500)
      .json({ valid: false, message: "Failed to validate discount code" });
  }
});
