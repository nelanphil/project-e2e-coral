import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

function cleanName(name: string): string {
  return name.trim().replace(/\s*\*+\s*$/, "").trim();
}

async function cleanProductNames() {
  const isDryRun = process.argv.includes("--dry-run");

  try {
    await connectDb();
    console.log("✅ Database connected");

    // Wait for indexes to be ready
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not ready");
    }
    await db.admin().ping();
    console.log("✅ Database ready");

    if (isDryRun) {
      console.log("🔍 DRY RUN MODE - No changes will be made\n");
    }

    // Find all products
    const products = await Product.find({}).lean();
    console.log(`Found ${products.length} total products\n`);

    const productsToUpdate: Array<{
      product: typeof products[0];
      cleanedName: string;
      candidateSlug: string;
    }> = [];

    // Identify products that need cleaning
    for (const product of products) {
      const cleanedName = cleanName(product.name);
      if (cleanedName !== product.name) {
        const candidateSlug = slugify(cleanedName);
        productsToUpdate.push({
          product,
          cleanedName,
          candidateSlug,
        });
      }
    }

    if (productsToUpdate.length === 0) {
      console.log("✅ No products need cleaning. All product names are clean!");
      await mongoose.connection.close();
      console.log("✅ Database connection closed");
      process.exit(0);
      return;
    }

    console.log(`Found ${productsToUpdate.length} products that need cleaning:\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ productId: string; error: string }> = [];

    // Process each product
    for (const { product, cleanedName, candidateSlug } of productsToUpdate) {
      const productId = String(product._id);
      const oldName = product.name;
      const oldSlug = product.slug;

      // Check if cleaned name would be empty
      if (!cleanedName) {
        console.log(
          `⚠️  SKIP: Product "${oldName}" (ID: ${productId}) - cleaned name would be empty`,
        );
        skippedCount++;
        continue;
      }

      // Check if candidate slug is already used by another product
      const existingProductWithSlug = await Product.findOne({
        slug: candidateSlug,
        _id: { $ne: product._id },
      }).lean();

      const newSlug = existingProductWithSlug
        ? oldSlug // Keep existing slug if conflict
        : candidateSlug; // Use new slug if available

      const nameChanged = cleanedName !== oldName;
      const slugChanged = newSlug !== oldSlug;

      if (!nameChanged && !slugChanged) {
        // Shouldn't happen, but handle gracefully
        skippedCount++;
        continue;
      }

      console.log(`📝 Product ID: ${productId}`);
      console.log(`   Name: "${oldName}" → "${cleanedName}"`);
      if (slugChanged) {
        console.log(`   Slug: "${oldSlug}" → "${newSlug}"`);
        if (existingProductWithSlug) {
          console.log(
            `   ⚠️  Slug conflict detected - keeping existing slug to avoid breaking URLs`,
          );
        }
      } else {
        console.log(`   Slug: "${oldSlug}" (unchanged)`);
      }
      console.log("");

      if (!isDryRun) {
        try {
          await Product.findByIdAndUpdate(product._id, {
            name: cleanedName,
            slug: newSlug,
          });
          updatedCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `❌ Error updating product ${productId}: ${errorMessage}`,
          );
          errors.push({ productId, error: errorMessage });
        }
      } else {
        updatedCount++; // Count for dry-run display
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    if (isDryRun) {
      console.log("🔍 DRY RUN SUMMARY");
    } else {
      console.log("✅ CLEANUP SUMMARY");
    }
    console.log("=".repeat(60));
    console.log(`Total products checked: ${products.length}`);
    console.log(`Products needing cleaning: ${productsToUpdate.length}`);
    console.log(`Products updated: ${updatedCount}`);
    if (skippedCount > 0) {
      console.log(`Products skipped: ${skippedCount}`);
    }
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
      errors.forEach(({ productId, error }) => {
        console.log(`  - Product ${productId}: ${error}`);
      });
    }

    if (isDryRun) {
      console.log(
        "\n💡 This was a dry run. Run without --dry-run to apply changes.",
      );
    } else {
      console.log("\n✅ Product name cleanup completed successfully!");
    }

    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    await mongoose.connection.close().finally(() => {
      process.exit(1);
    });
  }
}

cleanProductNames();
