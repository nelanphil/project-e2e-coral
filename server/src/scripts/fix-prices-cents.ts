/**
 * fix-prices-cents.ts
 *
 * Fixes product prices that were stored in dollars instead of cents.
 * Multiplies price, compareAtPrice, and cost by 100 for affected products.
 *
 * Heuristic to distinguish dollars from already-correct cents:
 *   - Values with a decimal part (12.99, 1.50) → definitely dollars → multiply
 *   - Integer values < 1000 (29, 39, 149, 499) → dollar amounts → multiply
 *   - Integer values >= 1000 (3900, 5900, 1900) → already cents via admin → skip
 *
 * Usage:
 *   DRY_RUN=1 npx tsx src/scripts/fix-prices-cents.ts   # preview only
 *   npx tsx src/scripts/fix-prices-cents.ts              # apply changes
 *
 * Set NODE_ENV=production in your shell to target the production database.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../lib/db.js";
import { Product } from "../models/Product.js";
import { PriceLog } from "../models/PriceLog.js";

const DRY_RUN = process.env.DRY_RUN === "1";
const MULTIPLIER = 100;

/**
 * Returns true if the value looks like a dollar amount that needs ×100.
 * - Has a decimal part (e.g. 12.99) → definitely dollars
 * - Is an integer < 1000 (e.g. 29, 149, 499) → dollar amounts
 * - Integer >= 1000 (e.g. 3900, 5900) → already in cents from admin panel
 */
function needsConversion(value: number): boolean {
  if (value <= 0) return false;
  const hasDecimals = value !== Math.floor(value);
  if (hasDecimals) return true;
  return value < 1000;
}

async function run() {
  await connectDb();
  console.log(
    `\n🔧 Fix prices — ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE RUN"}`,
  );
  console.log(`   Multiplier: ×${MULTIPLIER}`);
  console.log(
    `   Rule: decimal values or integers < 1000 are treated as dollars\n`,
  );

  const products = await Product.find({ deletedAt: null }).lean<
    Array<{ _id: mongoose.Types.ObjectId; name: string; price: number; compareAtPrice?: number; cost: number }>
  >();
  console.log(`Found ${products.length} non-deleted products.\n`);

  let updated = 0;
  let skipped = 0;
  const priceLogs: {
    product: mongoose.Types.ObjectId;
    field: "price" | "compareAtPrice" | "cost";
    valueBefore: number;
    valueAfter: number;
  }[] = [];

  for (const p of products) {
    const priceNeeds = needsConversion(p.price);
    const compareNeeds =
      p.compareAtPrice != null && needsConversion(p.compareAtPrice);
    const costNeeds = needsConversion(p.cost);

    if (!priceNeeds && !compareNeeds && !costNeeds) {
      skipped++;
      continue;
    }

    const newPrice = priceNeeds ? Math.round(p.price * MULTIPLIER) : p.price;
    const newCompare = compareNeeds
      ? Math.round(p.compareAtPrice! * MULTIPLIER)
      : p.compareAtPrice;
    const newCost = costNeeds ? Math.round(p.cost * MULTIPLIER) : p.cost;

    console.log(
      `${DRY_RUN ? "[DRY] " : ""}${p.name} (${p._id})` +
        `\n   price: ${p.price} → ${newPrice}  ($${(p.price / 100).toFixed(2)} → $${(newPrice / 100).toFixed(2)})` +
        (p.compareAtPrice != null
          ? `\n   compareAtPrice: ${p.compareAtPrice} → ${newCompare}`
          : "") +
        (p.cost > 0 ? `\n   cost: ${p.cost} → ${newCost}` : "") +
        "\n",
    );

    if (p.price !== newPrice) {
      priceLogs.push({
        product: p._id,
        field: "price",
        valueBefore: p.price,
        valueAfter: newPrice,
      });
    }
    if (p.compareAtPrice != null && p.compareAtPrice !== newCompare) {
      priceLogs.push({
        product: p._id,
        field: "compareAtPrice",
        valueBefore: p.compareAtPrice,
        valueAfter: newCompare!,
      });
    }
    if (p.cost !== newCost) {
      priceLogs.push({
        product: p._id,
        field: "cost",
        valueBefore: p.cost,
        valueAfter: newCost,
      });
    }

    if (!DRY_RUN) {
      await Product.updateOne(
        { _id: p._id },
        {
          $set: { price: newPrice, compareAtPrice: newCompare, cost: newCost },
        },
      );
    }

    updated++;
  }

  if (!DRY_RUN && priceLogs.length > 0) {
    await PriceLog.insertMany(
      priceLogs.map((log) => ({
        ...log,
        reason: "correction" as const,
        notes:
          "Bulk fix: prices were stored in dollars instead of cents (×100)",
      })),
    );
    console.log(`📝 Logged ${priceLogs.length} price change(s) to PriceLog.`);
  }

  console.log(`\n✅ Done. Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
