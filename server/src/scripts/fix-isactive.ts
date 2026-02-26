import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";

async function fixIsActive() {
  await connectDb();

  const result = await Product.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );

  console.log(`Updated ${result.modifiedCount} products: set isActive to true`);

  await mongoose.disconnect();
}

fixIsActive().catch((err) => {
  console.error(err);
  process.exit(1);
});
