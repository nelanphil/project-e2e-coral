import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { Product } from "../models/Product.js";

async function countIsActive() {
  await connectDb();

  const [total, isActiveTrue, isActiveFalse, isActiveUndefined] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: false }),
    Product.countDocuments({ isActive: { $exists: false } }),
  ]);

  console.log("Product isActive breakdown:");
  console.log("  Total products:", total);
  console.log("  isActive: true", isActiveTrue);
  console.log("  isActive: false", isActiveFalse);
  console.log("  isActive: undefined (field missing):", isActiveUndefined);

  await import("mongoose").then((m) => m.default.disconnect());
}

countIsActive().catch((err) => {
  console.error(err);
  process.exit(1);
});
