import mongoose from "mongoose";
import {
  OrderStatusLog,
  type OrderStatusChangeReason,
  type OrderStatusValue,
} from "../models/OrderStatusLog.js";

interface LogOrderStatusChangeInput {
  orderId: mongoose.Types.ObjectId | string;
  statusBefore?: string | null;
  statusAfter?: string | null;
  reason: OrderStatusChangeReason;
  performedBy?: mongoose.Types.ObjectId | string;
  notes?: string;
}

export async function logOrderStatusChange(
  input: LogOrderStatusChangeInput,
): Promise<void> {
  const statusBefore = input.statusBefore?.trim().toLowerCase();
  const statusAfter = input.statusAfter?.trim().toLowerCase();

  if (!statusBefore || !statusAfter || statusBefore === statusAfter) {
    return;
  }

  let performedBy: mongoose.Types.ObjectId | undefined;
  if (input.performedBy && mongoose.isValidObjectId(input.performedBy)) {
    performedBy = new mongoose.Types.ObjectId(String(input.performedBy));
  }

  await OrderStatusLog.create({
    order: input.orderId,
    statusBefore: statusBefore as OrderStatusValue,
    statusAfter: statusAfter as OrderStatusValue,
    reason: input.reason,
    notes: input.notes ?? "",
    ...(performedBy ? { performedBy } : {}),
  });
}
