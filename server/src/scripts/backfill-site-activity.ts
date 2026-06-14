import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { connectDb } from "../lib/db.js";
import { localActivityDayAndIso } from "../lib/site-activity-record.js";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { SiteActivityLog } from "../models/SiteActivityLog.js";
import { User, type IUser } from "../models/User.js";

type BackfillSource = "cart" | "checkout";

function guestKeyFromFields(fields: {
  cookieId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}): string | null {
  if (fields.cookieId?.trim()) return fields.cookieId.trim();
  if (fields.sessionId?.trim()) return `sess:${fields.sessionId.trim()}`;
  const ip = fields.ipAddress ?? "";
  const ua = (fields.userAgent ?? "").slice(0, 120);
  if (!ip && !ua) return null;
  return crypto
    .createHash("sha256")
    .update(`${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

function activityDayFromDate(at: Date): { activityDay: Date; dayIso: string } {
  return localActivityDayAndIso(at);
}

async function visitorSegmentFor(
  userId: mongoose.Types.ObjectId | null,
): Promise<"anonymous" | "guest_user" | "customer" | "admin"> {
  if (!userId) return "anonymous";
  const u = (await User.findById(userId).select("role").lean()) as
    | Pick<IUser, "role">
    | null;
  if (!u) return "anonymous";
  if (u.role === "customer") return "customer";
  if (u.role === "guest") return "guest_user";
  if (u.role === "admin") return "admin";
  return "anonymous";
}

async function upsertFromEvent(opts: {
  at: Date;
  userId?: mongoose.Types.ObjectId | null;
  cookieId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  acceptLanguage?: string;
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  source: BackfillSource;
}): Promise<"inserted" | "updated" | "skipped"> {
  const { activityDay, dayIso } = activityDayFromDate(opts.at);
  const userId = opts.userId ?? null;

  let dedupeKey: string;
  let identityKey: string;
  let visitorKey: string;

  if (userId) {
    const uid = userId.toString();
    identityKey = `u:${uid}`;
    visitorKey = identityKey;
    dedupeKey = `u:${uid}:${dayIso}`;
  } else {
    const g = guestKeyFromFields({
      cookieId: opts.cookieId,
      sessionId: opts.sessionId,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
    if (!g) return "skipped";
    identityKey = `g:${g}`;
    visitorKey = g;
    dedupeKey = `g:${g}:${dayIso}`;
  }

  const existing = await SiteActivityLog.findOne({ dedupeKey }).lean();
  const visitorSegment = await visitorSegmentFor(userId);
  const ip = opts.ipAddress?.trim() || "unknown";
  const at = opts.at;

  await SiteActivityLog.findOneAndUpdate(
    { dedupeKey },
    {
      $setOnInsert: {
        dedupeKey,
        activityDay,
        user: userId,
        identityKey,
        visitorKey,
        firstSeenAt: at,
        hitCount: 0,
      },
      $set: {
        lastSource: opts.source,
        visitorSegment,
        ipAddress: ip,
        ...(opts.userAgent && { userAgent: opts.userAgent }),
        ...(opts.referer && { referer: opts.referer }),
        ...(opts.acceptLanguage && { acceptLanguage: opts.acceptLanguage }),
        ...(opts.cookieId && { cookieId: opts.cookieId }),
        ...(opts.geoCountry && { geoCountry: opts.geoCountry }),
        ...(opts.geoRegion && { geoRegion: opts.geoRegion }),
        ...(opts.geoCity && { geoCity: opts.geoCity }),
      },
      $max: { lastSeenAt: at },
      $inc: { hitCount: 1 },
    },
    { upsert: true },
  );

  return existing ? "updated" : "inserted";
}

function parseArgs(): { from: Date; to: Date } {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let from = defaultFrom;
  let to = defaultTo;

  for (const arg of process.argv.slice(2)) {
    const fromMatch = arg.match(/^--from=(\d{4}-\d{2}-\d{2})$/);
    const toMatch = arg.match(/^--to=(\d{4}-\d{2}-\d{2})$/);
    if (fromMatch) from = new Date(`${fromMatch[1]}T00:00:00`);
    if (toMatch) to = new Date(`${toMatch[1]}T00:00:00`);
  }

  return { from, to };
}

async function main() {
  const { from, to } = parseArgs();
  console.log(
    `Backfilling SiteActivityLog from ${from.toISOString()} to ${to.toISOString()}…`,
  );

  await connectDb();

  const stats = { inserted: 0, updated: 0, skipped: 0 };

  const carts = await Cart.find({
    lastActivityAt: { $gte: from, $lt: to },
  }).lean();

  for (const cart of carts) {
    const result = await upsertFromEvent({
      at: cart.lastActivityAt,
      userId: cart.user ?? null,
      cookieId: cart.cookieId,
      sessionId: cart.sessionId,
      ipAddress: cart.ipAddress,
      userAgent: cart.userAgent,
      referer: cart.referer,
      acceptLanguage: cart.acceptLanguage,
      geoCountry: cart.geoCountry,
      geoRegion: cart.geoRegion,
      geoCity: cart.geoCity,
      source: "cart",
    });
    stats[result] += 1;
  }

  const orders = await Order.find({
    createdAt: { $gte: from, $lt: to },
  }).lean();

  for (const order of orders) {
    const result = await upsertFromEvent({
      at: order.createdAt,
      userId: order.user ?? null,
      sessionId: order.cartSessionId,
      ipAddress: order.ipAddress,
      userAgent: order.userAgent,
      referer: order.referer,
      geoCountry: order.geoCountry,
      geoRegion: order.geoRegion,
      geoCity: order.geoCity,
      source: "checkout",
    });
    stats[result] += 1;
  }

  console.log(
    `Done. Carts: ${carts.length}, Orders: ${orders.length}. Upserts — inserted: ${stats.inserted}, updated: ${stats.updated}, skipped: ${stats.skipped}.`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
