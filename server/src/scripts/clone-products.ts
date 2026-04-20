import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const PROD_URI = process.env.MONGODB_PRODUCTION_URI!;
const DEV_URI = process.env.MONGODB_DEVELOPMENT_URI!;

async function cloneProducts() {
  if (!PROD_URI || !DEV_URI) {
    console.error("Missing MONGODB_PRODUCTION_URI or MONGODB_DEVELOPMENT_URI");
    process.exit(1);
  }

  console.log("Connecting to production...");
  const prodConn = await mongoose.createConnection(PROD_URI).asPromise();

  console.log("Connecting to development...");
  const devConn = await mongoose.createConnection(DEV_URI).asPromise();

  const prodCollection = prodConn.db!.collection("products");
  const devCollection = devConn.db!.collection("products");

  const products = await prodCollection.find({}).toArray();
  console.log(`Found ${products.length} products in production.`);

  if (products.length === 0) {
    console.log("No products to clone.");
  } else {
    // Drop existing dev products and insert production data
    await devCollection.deleteMany({});
    console.log("Cleared development products collection.");

    await devCollection.insertMany(products);
    console.log(`Inserted ${products.length} products into development.`);
  }

  await prodConn.close();
  await devConn.close();
  console.log("Done.");
}

cloneProducts().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
