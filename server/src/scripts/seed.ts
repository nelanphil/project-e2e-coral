import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Inventory } from "../models/Inventory.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

async function seed() {
  try {
    await connectDb();
    console.log("✅ Database connected");

    // Wait for indexes to be ready
    await mongoose.connection.db.admin().ping();
    console.log("✅ Database ready");

    // Seed admin user
    const adminEmail = "pnelan@gmail.com";
    console.log("Checking for existing admin user...");
    const existingAdmin = await User.findOne({ email: adminEmail }).lean();
    if (!existingAdmin) {
      console.log("Creating admin user...");
      const passwordHash = await bcrypt.hash("Admin12345", 10);
      const adminUser = await User.create({
        email: adminEmail,
        passwordHash,
        name: "Admin",
        role: "admin",
        visitCount: 0,
      });
      console.log("✅ Admin user created:", adminEmail, "ID:", adminUser._id);
    } else {
      console.log("✅ Admin user already exists:", adminEmail);
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }

  // Note: Products and inventory are not seeded - they should be created through the admin interface
  // Categories can be optionally seeded if needed
  // await Category.deleteMany({});
  // await Category.insertMany([
  //   { name: "Soft Coral", slug: "soft-coral" },
  //   { name: "LPS", slug: "lps" },
  //   { name: "SPS", slug: "sps" },
  // ]);

  console.log("Seed complete: admin user created.");
  
  // Close database connection
  await mongoose.connection.close();
  console.log("✅ Database connection closed");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  mongoose.connection.close().finally(() => {
    process.exit(1);
  });
});
