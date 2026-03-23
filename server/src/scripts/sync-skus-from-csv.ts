import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Inventory } from "../models/Inventory.js";
import type { ICategory } from "../models/Category.js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import mongoose from "mongoose";

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

function cleanName(name: string): string {
  return name
    .trim()
    .replace(/\s*\*+\s*$/, "")
    .trim();
}

interface CSVRow {
  Title: string;
  "Variant SKU": string;
  "Variant Inventory Qty": string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Cost per item": string;
  Status: string;
}

async function syncSkusFromCsv() {
  try {
    await connectDb();
    console.log("✅ Database connected");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not ready");
    }
    await db.admin().ping();
    console.log("✅ Database ready");

    // Read CSV file
    const csvPath = join(
      process.cwd(),
      "src",
      "scripts",
      "products_export_2.csv",
    );
    console.log(`Reading CSV file from: ${csvPath}`);
    const csvContent = readFileSync(csvPath, "utf-8");

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];

    console.log(`✅ Parsed ${records.length} rows from CSV\n`);

    // Get or create "Uncategorized" category (needed for new products)
    let uncategorizedCategory = await Category.findOne({
      slug: "uncategorized",
    }).lean<ICategory | null>();

    if (!uncategorizedCategory) {
      console.log("Creating 'Uncategorized' category...");
      const newCategory = await Category.create({
        name: "Uncategorized",
        slug: "uncategorized",
      });
      uncategorizedCategory = newCategory.toObject();
    }

    if (!uncategorizedCategory) {
      throw new Error("Failed to load uncategorized category");
    }

    console.log(
      `✅ Using category: ${uncategorizedCategory.name} (ID: ${uncategorizedCategory._id})\n`,
    );

    const categoryId = uncategorizedCategory._id;

    // Process each row
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rawTitle = row.Title?.trim();

      // Skip rows without title
      if (!rawTitle) {
        console.log(`⚠️  Row ${i + 1}: Skipping - no title`);
        skippedCount++;
        continue;
      }

      // Clean title: remove trailing * and whitespace
      const title = cleanName(rawTitle);
      const sku = row["Variant SKU"]?.trim() || null;
      const quantityStr = row["Variant Inventory Qty"]?.trim() || "0";
      const quantity = parseInt(quantityStr, 10) || 0;
      const price = parseFloat(row["Variant Price"]?.trim()) || 0;
      const compareAtPrice =
        parseFloat(row["Variant Compare At Price"]?.trim()) || null;
      const cost = parseFloat(row["Cost per item"]?.trim()) || 0;
      const status = row.Status?.trim().toLowerCase();
      const isActive = status === "active";

      try {
        const slug = slugify(title);

        // Look up existing product: by slug first, then case-insensitive name match
        let existingProduct = await Product.findOne({ slug });
        if (!existingProduct) {
          existingProduct = await Product.findOne({
            name: {
              $regex: new RegExp(
                `^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
            },
          });
        }

        if (existingProduct) {
          // Update existing product: SKU + pricing
          const updates: Record<string, unknown> = {};
          const changes: string[] = [];

          if (sku && existingProduct.sku !== sku) {
            updates.sku = sku;
            changes.push(`SKU: ${existingProduct.sku || "null"} → ${sku}`);
          }
          if (price && existingProduct.price !== price) {
            updates.price = price;
            changes.push(`price: ${existingProduct.price} → ${price}`);
          }
          if (
            compareAtPrice &&
            existingProduct.compareAtPrice !== compareAtPrice
          ) {
            updates.compareAtPrice = compareAtPrice;
            changes.push(
              `compareAtPrice: ${existingProduct.compareAtPrice || "null"} → ${compareAtPrice}`,
            );
          }
          if (cost && existingProduct.cost !== cost) {
            updates.cost = cost;
            changes.push(`cost: ${existingProduct.cost} → ${cost}`);
          }

          if (Object.keys(updates).length > 0) {
            await Product.updateOne(
              { _id: existingProduct._id },
              { $set: updates },
            );
          }

          // Upsert inventory
          await Inventory.findOneAndUpdate(
            { product: existingProduct._id },
            { product: existingProduct._id, quantity },
            { upsert: true, new: true },
          );

          if (changes.length > 0) {
            console.log(
              `✏️  Row ${i + 1}: Updated "${title}" — ${changes.join(", ")}`,
            );
            console.log(`   📦 Inventory set to ${quantity}`);
          } else {
            console.log(
              `✏️  Row ${i + 1}: "${title}" — fields already current, inventory → ${quantity}`,
            );
          }

          updatedCount++;
        } else {
          // Create new product
          const product = await Product.create({
            name: title,
            slug,
            sku: sku || null,
            description: "",
            price,
            compareAtPrice,
            cost,
            category: categoryId,
            images: [],
            collections: [],
            isActive,
          });

          // Create inventory record
          await Inventory.findOneAndUpdate(
            { product: product._id },
            { product: product._id, quantity },
            { upsert: true, new: true },
          );

          console.log(
            `✅ Row ${i + 1}: Created "${title}" (ID: ${product._id}, SKU: ${sku || "N/A"}, price: ${price}, isActive: ${isActive})`,
          );
          console.log(`   📦 Inventory set to ${quantity}`);

          createdCount++;
        }
      } catch (error: any) {
        errorCount++;
        console.error(
          `❌ Row ${i + 1}: Error processing "${title}":`,
          error.message,
        );
      }
    }

    console.log("\n📊 Sync Summary:");
    console.log(`   ✏️  Updated: ${updatedCount} products`);
    console.log(`   ✅ Created: ${createdCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} rows`);
    console.log(`   ❌ Errors: ${errorCount} rows`);

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

syncSkusFromCsv();
