/**
 * Copies all collections from the development database to the production database.
 * Uses the raw MongoDB driver (via mongoose) to avoid model-level restrictions.
 *
 * Usage:
 *   tsx src/scripts/copy-db-to-prod.ts
 *
 * WARNING: This will OVERWRITE all data in the production database.
 * Run with caution.
 */

import "dotenv/config";
import mongoose from "mongoose";

const DEV_URI = process.env.MONGODB_DEVELOPMENT_URI;
const PROD_URI = process.env.MONGODB_PRODUCTION_URI;

if (!DEV_URI || !PROD_URI) {
  console.error(
    "❌ MONGODB_DEVELOPMENT_URI and MONGODB_PRODUCTION_URI must be set in .env"
  );
  process.exit(1);
}

// Collections to skip (transient/session data)
const SKIP_COLLECTIONS = new Set(["carts", "sessions"]);

async function copyDb() {
  console.log("🔌 Connecting to development database...");
  const devConn = await mongoose.createConnection(DEV_URI!).asPromise();

  console.log("🔌 Connecting to production database...");
  const prodConn = await mongoose.createConnection(PROD_URI!).asPromise();

  const devDb = devConn.db;
  const prodDb = prodConn.db;

  if (!devDb || !prodDb) {
    throw new Error("Failed to get database references");
  }

  const collections = await devDb.listCollections().toArray();
  console.log(
    `\n📋 Found ${collections.length} collections in development database`
  );

  for (const collInfo of collections) {
    const name = collInfo.name;

    if (SKIP_COLLECTIONS.has(name)) {
      console.log(`⏭️  Skipping collection: ${name}`);
      continue;
    }

    const devCol = devDb.collection(name);
    const prodCol = prodDb.collection(name);

    const docs = await devCol.find({}).toArray();
    console.log(`\n📦 ${name}: ${docs.length} documents`);

    if (docs.length === 0) {
      continue;
    }

    // Drop the existing production collection and re-insert
    await prodCol.drop().catch(() => {
      // Ignore error if collection doesn't exist yet
    });

    const result = await prodCol.insertMany(docs);
    console.log(`   ✅ Inserted ${result.insertedCount} documents`);
  }

  await devConn.close();
  await prodConn.close();
  console.log("\n🎉 Database copy complete!");
}

copyDb().catch((err) => {
  console.error("❌ Error copying database:", err);
  process.exit(1);
});
