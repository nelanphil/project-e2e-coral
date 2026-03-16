/**
 * One-time sync: backfill collection.products from product.collections.
 * Run when products were tagged via the product form but collection.products was never updated.
 *
 * Usage: npx tsx src/scripts/sync-collection-products.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../lib/db.js";
import { Collection } from "../models/Collection.js";
import { Product } from "../models/Product.js";

async function sync() {
  await connectDb();
  console.log("Syncing collection.products from product.collections...");

  const products = await Product.find({ deletedAt: null })
    .select("_id collections")
    .lean();

  const collectionToProducts = new Map<string, Set<string>>();

  for (const p of products) {
    const collIds = p.collections ?? [];
    for (const cid of collIds) {
      const key = String(cid);
      if (!collectionToProducts.has(key)) {
        collectionToProducts.set(key, new Set());
      }
      collectionToProducts.get(key)!.add(String(p._id));
    }
  }

  const collections = await Collection.find({ deletedAt: null });
  let updated = 0;

  for (const c of collections) {
    const productIds = collectionToProducts.get(String(c._id));
    if (!productIds || productIds.size === 0) continue;

    const existingIds = new Set(
      (c.products ?? []).map((id: mongoose.Types.ObjectId) => String(id)),
    );
    const toAdd = [...productIds].filter((id) => !existingIds.has(id));
    if (toAdd.length === 0) continue;

    await Collection.findByIdAndUpdate(c._id, {
      $addToSet: {
        products: { $each: toAdd.map((id) => new mongoose.Types.ObjectId(id)) },
      },
    });
    updated++;
    console.log(`  Updated ${c.name}: added ${toAdd.length} products`);
  }

  console.log(`Done. Updated ${updated} collections.`);
  await mongoose.connection.close();
  process.exit(0);
}

sync().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
