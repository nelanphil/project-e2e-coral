import "dotenv/config";
import { connectDb } from "../lib/db.js";
import { User } from "../models/User.js";
import { StaticPage } from "../models/StaticPage.js";
import { getDefaultSections, getDefaultSlugs } from "../data/staticPageDefaults.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

async function seed() {
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

  // Seed static pages (Customer Service, Shipping & Returns, Privacy Policy, Terms of Service)
  try {
    const slugs = getDefaultSlugs();
    let pagesSeeded = 0;
    for (const slug of slugs) {
      const page = await StaticPage.findOne({ slug }).lean();
      const sections = page?.sections ?? [];
      if (sections.length === 0) {
        const defaultSections = getDefaultSections(slug);
        if (defaultSections?.length) {
          await StaticPage.findOneAndUpdate(
            { slug },
            { $set: { sections: defaultSections } },
            { upsert: true }
          );
          pagesSeeded++;
          console.log("✅ Static page seeded:", slug);
        }
      }
    }
    if (pagesSeeded > 0) {
      console.log(`✅ ${pagesSeeded} static page(s) seeded.`);
    } else {
      console.log("✅ Static pages already present.");
    }
  } catch (error) {
    console.error("Error seeding static pages:", error);
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

  console.log("Seed complete: admin user and static pages ready.");
  
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
