import cron from "node-cron";
import { Cart } from "../models/Cart.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";

const CRON_SCHEDULE = "*/5 * * * *"; // Every 5 minutes
const DEFAULT_TIMEOUT_MINUTES = 30;

function getTimeoutMinutes(): number {
  const val = process.env.CART_RESERVATION_TIMEOUT_MINUTES;
  const parsed = val ? parseInt(val, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MINUTES;
}

export async function runReleaseStaleCartReservations(): Promise<number> {
  const timeoutMs = getTimeoutMinutes() * 60 * 1000;
  const cutoff = new Date(Date.now() - timeoutMs);

  const staleCarts = await Cart.find({
    $and: [
      { "items.0": { $exists: true } },
      {
        $or: [
          { lastActivityAt: { $lt: cutoff } },
          { lastActivityAt: { $exists: false } },
        ],
      },
    ],
  }).lean();

  let released = 0;
  for (const cart of staleCarts) {
    const items = cart.items ?? [];
    if (items.length === 0) continue;

    for (const item of items) {
      const productId = item.product;
      let inv = await Inventory.findOne({ product: productId });
      if (!inv) {
        inv = await Inventory.create({ product: productId, quantity: 0 });
      }
      const oldQty = inv.quantity;
      inv.quantity = oldQty + item.quantity;
      await inv.save();
      await InventoryLog.create({
        product: productId,
        quantityBefore: oldQty,
        quantityAfter: inv.quantity,
        change: item.quantity,
        reason: "cart_remove",
      });
    }

    await Cart.updateOne(
      { _id: cart._id },
      { $set: { items: [], lastActivityAt: new Date() } }
    );
    released++;
  }

  if (released > 0) {
    console.log(`[releaseStaleCartReservations] Released ${released} stale cart(s)`);
  }
  return released;
}

export function startReleaseStaleCartReservationsJob(): void {
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await runReleaseStaleCartReservations();
    } catch (err) {
      console.error("[releaseStaleCartReservations] Error:", err);
    }
  });
  console.log(`[releaseStaleCartReservations] Job scheduled (every 5 min, timeout ${getTimeoutMinutes()} min)`);
}
