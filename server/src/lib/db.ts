import mongoose from "mongoose";

const NODE_ENV = process.env.NODE_ENV || "development";

const getMongoDbUri = (): string => {
  if (NODE_ENV === "production") {
    return process.env.MONGODB_PRODUCTION_URI || "";
  }
  return process.env.MONGODB_DEVELOPMENT_URI || "";
};

const MONGODB_URI = getMongoDbUri() || "mongodb://localhost:27017/coral-store";

if (MONGODB_URI === "mongodb://localhost:27017/coral-store") {
  console.warn(
    "⚠️  Warning: Using localhost MongoDB. Set MONGODB_DEVELOPMENT_URI or MONGODB_PRODUCTION_URI in .env",
  );
}

export async function connectDb(): Promise<typeof mongoose> {
  console.log(`🔌 Connecting to MongoDB (${NODE_ENV})...`);
  return mongoose.connect(MONGODB_URI);
}
