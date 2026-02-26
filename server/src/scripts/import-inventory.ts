import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Inventory } from "../models/Inventory.js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

interface CSVRow {
  Title: string;
  SKU: string;
  "On hand (current)": string;
}

async function importInventory() {
  try {
    await connectDb();
    console.log("✅ Database connected");

    // Wait for indexes to be ready
    await mongoose.connection.db.admin().ping();
    console.log("✅ Database ready");

    // Read CSV file
    const csvPath = join(__dirname, "inventory_export.csv");
    console.log(`Reading CSV file from: ${csvPath}`);
    const csvContent = readFileSync(csvPath, "utf-8");

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];

    console.log(`✅ Parsed ${records.length} rows from CSV`);

    // Get or create "Uncategorized" category
    let uncategorizedCategory = await Category.findOne({
      slug: "uncategorized",
    }).lean();

    if (!uncategorizedCategory) {
      console.log("Creating 'Uncategorized' category...");
      const newCategory = await Category.create({
        name: "Uncategorized",
        slug: "uncategorized",
      });
      uncategorizedCategory = newCategory.toObject();
      console.log(
        `✅ Created category: ${uncategorizedCategory.name} (ID: ${uncategorizedCategory._id})`,
      );
    } else {
      console.log(
        `✅ Using existing category: ${uncategorizedCategory.name} (ID: ${uncategorizedCategory._id})`,
      );
    }

    const categoryId = uncategorizedCategory._id;

    // Process each row
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const title = row.Title?.trim();
      const sku = row.SKU?.trim() || null;
      const quantityStr = row["On hand (current)"]?.trim() || "0";
      const quantity = parseInt(quantityStr, 10) || 0;

      // Skip rows without title
      if (!title) {
        console.log(`⚠️  Row ${i + 1}: Skipping - no title`);
        skippedCount++;
        continue;
      }

      try {
        // Generate slug from title
        const slug = slugify(title);

        // Check if product already exists (by SKU if present, or by slug)
        let existingProduct = null;
        if (sku) {
          existingProduct = await Product.findOne({ sku }).lean();
        }
        if (!existingProduct) {
          existingProduct = await Product.findOne({ slug }).lean();
        }

        if (existingProduct) {
          console.log(
            `⏭️  Row ${i + 1}: Skipping "${title}" - product already exists (SKU: ${sku || "N/A"}, Slug: ${slug})`,
          );
          skippedCount++;
          continue;
        }

        // Create product
        const product = await Product.create({
          name: title,
          slug: slug,
          sku: sku || null,
          description: "",
          price: 0,
          cost: 0,
          category: categoryId,
          images: [],
          collections: [],
        });

        console.log(
          `✅ Row ${i + 1}: Created product "${title}" (ID: ${product._id}, SKU: ${sku || "N/A"}, Slug: ${slug})`,
        );

        // Create or update inventory
        await Inventory.findOneAndUpdate(
          { product: product._id },
          { product: product._id, quantity: quantity },
          { upsert: true, new: true },
        );

        console.log(
          `   📦 Inventory set to ${quantity} for product "${title}"`,
        );

        createdCount++;
      } catch (error: any) {
        errorCount++;
        console.error(
          `❌ Row ${i + 1}: Error processing "${title}":`,
          error.message,
        );
        // Continue processing other rows even if one fails
      }
    }

    console.log("\n📊 Import Summary:");
    console.log(`   ✅ Created: ${createdCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products`);
    console.log(`   ❌ Errors: ${errorCount} products`);

    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

importInventory().catch((err) => {
  console.error("Fatal error:", err);
  mongoose.connection.close().finally(() => {
    process.exit(1);
  });
});
