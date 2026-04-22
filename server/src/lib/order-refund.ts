import type { IOrder } from "../models/Order.js";
import { User } from "../models/User.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { RewardLog } from "../models/RewardLog.js";
import { RewardsSettings } from "../models/RewardsSettings.js";

/**
 * Process all side-effect reversals when an order is refunded.
 * - Reverses earned reward points (deducts from user balance)
 * - Returns spent reward points to user balance
 * - Restores inventory quantities for each line item
 *
 * Shared by the admin refund endpoint and the charge.refunded webhook handler.
 */
export async function processRefundReversals(order: IOrder): Promise<void> {
  const userId = order.user?.toString();
  const orderLabel =
    order.orderNumber ?? order._id.toString().slice(-6).toUpperCase();

  // ── Reverse reward points ──────────────────────────────────────────────────
  if (userId) {
    // 1. Reverse earned points: recalculate what was earned and deduct it
    const rewardsSettings = (await RewardsSettings.findOne().lean()) as {
      pointsPerDollar?: number;
    } | null;
    const pointsPerDollar = rewardsSettings?.pointsPerDollar ?? 10;

    if (pointsPerDollar > 0) {
      const subtotal = order.lineItems.reduce(
        (sum, li) => sum + li.price * li.quantity,
        0,
      );
      const discountCents = order.discountAmountCents ?? 0;
      const pointsDiscountCents = order.pointsDiscountCents ?? 0;
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
          $inc: { pointsBalance: -pointsEarned },
        });
        await RewardLog.create({
          user: userId,
          type: "adjusted",
          points: -pointsEarned,
          order: order._id,
          description: `Refund reversal – earned points for Order #${orderLabel}`,
        });
      }
    }

    // 2. Return spent points to user
    const pointsApplied = order.pointsApplied ?? 0;
    if (pointsApplied > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { pointsBalance: pointsApplied },
      });
      await RewardLog.create({
        user: userId,
        type: "adjusted",
        points: pointsApplied,
        order: order._id,
        description: `Refund reversal – returned spent points for Order #${orderLabel}`,
      });
    }
  }

  // ── Restore inventory quantities ───────────────────────────────────────────
  for (const li of order.lineItems) {
    const productId = li.product.toString();
    const inv = await Inventory.findOne({ product: productId });
    if (inv) {
      const oldQty = inv.quantity;
      const newQty = oldQty + li.quantity;
      inv.quantity = newQty;
      await inv.save();

      await InventoryLog.create({
        product: productId,
        quantityBefore: oldQty,
        quantityAfter: newQty,
        change: li.quantity,
        reason: "restock",
        notes: `Refund restock for Order #${orderLabel}`,
      });
    }
  }
}
