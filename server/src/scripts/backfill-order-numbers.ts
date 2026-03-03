import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";

/**
 * Backfill script for existing orders:
 * 1. Assigns CFC-YYYYMMDD-NNNN order numbers based on createdAt date
 * 2. Backfills email from the associated user document
 * 3. Sets paymentStatus based on existing payment IDs and status
 *
 * Run with: npx tsx src/scripts/backfill-order-numbers.ts
 */
async function backfill() {
  try {
    await connectDb();
    console.log("✅ Database connected");
    await mongoose.connection.db!.admin().ping();

    // Fetch all orders sorted by createdAt ascending
    const orders = await Order.find()
      .sort({ createdAt: 1 })
      .populate("user", "email")
      .lean();

    console.log(`Found ${orders.length} orders to process`);

    // Group orders by date for sequential numbering
    const dateCounters: Record<string, number> = {};
    let updated = 0;

    for (const order of orders) {
      const updates: Record<string, unknown> = {};

      // 1. Generate orderNumber if missing
      if (!order.orderNumber) {
        const d = new Date(order.createdAt);
        const y = d.getFullYear().toString();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        const dateStr = `${y}${m}${day}`;

        dateCounters[dateStr] = (dateCounters[dateStr] ?? 0) + 1;
        const seq = dateCounters[dateStr].toString().padStart(4, "0");
        updates.orderNumber = `CFC-${dateStr}-${seq}`;
      }

      // 2. Backfill email from user
      if (!order.email && order.user) {
        const user = order.user as unknown as { email?: string };
        if (user.email) {
          updates.email = user.email;
        }
      }

      // 3. Set paymentStatus
      if (!order.paymentStatus) {
        if (order.status === "refunded") {
          updates.paymentStatus = "refunded";
        } else if (order.stripePaymentIntentId || order.paypalOrderId) {
          updates.paymentStatus = "paid";
        } else if (
          order.status === "paid" ||
          order.status === "shipped" ||
          order.status === "delivered"
        ) {
          updates.paymentStatus = "paid";
        } else {
          updates.paymentStatus = "unpaid";
        }
      }

      if (Object.keys(updates).length > 0) {
        await Order.updateOne({ _id: order._id }, { $set: updates });
        updated++;
        console.log(
          `  Updated ${updates.orderNumber ?? order.orderNumber ?? order._id} → ${JSON.stringify(updates)}`,
        );
      }
    }

    console.log(
      `\n✅ Backfill complete: ${updated}/${orders.length} orders updated`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  }
}

backfill();
