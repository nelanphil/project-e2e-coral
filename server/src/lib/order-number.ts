import mongoose, { Schema, model } from "mongoose";

interface IOrderCounter {
  date: string;
  seq: number;
}

const orderCounterSchema = new Schema<IOrderCounter>(
  {
    date: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false },
);

const OrderCounter =
  mongoose.models.OrderCounter ??
  model<IOrderCounter>("OrderCounter", orderCounterSchema);

/**
 * Generate an atomic, sequential order number in the format CFC-YYYYMMDD-NNNN.
 * Uses a MongoDB counter collection with findOneAndUpdate + upsert + $inc
 * to guarantee uniqueness even under concurrent requests.
 */
export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const dateStr = `${y}${m}${d}`;

  const counter = await OrderCounter.findOneAndUpdate(
    { date: dateStr },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );

  const seq = counter.seq.toString().padStart(4, "0");
  return `CFC-${dateStr}-${seq}`;
}
