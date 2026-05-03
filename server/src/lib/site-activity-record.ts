import crypto from "node:crypto";
import mongoose from "mongoose";
import type { AuthRequest } from "../middleware/auth.js";
import {
  SiteActivityLog,
  type SiteActivitySource,
  type SiteActivityVisitorSegment,
} from "../models/SiteActivityLog.js";
import { type IUser, User } from "../models/User.js";
import {
  enrichWithGeo,
  getVisitorMeta,
  sanitizeCartSessionHeader,
} from "../lib/visitor-meta.js";

function localActivityDayAndIso(now = new Date()): {
  activityDay: Date;
  dayIso: string;
} {
  const activityDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const y = activityDay.getFullYear();
  const m = String(activityDay.getMonth() + 1).padStart(2, "0");
  const d = String(activityDay.getDate()).padStart(2, "0");
  return { activityDay, dayIso: `${y}-${m}-${d}` };
}

function guestKeyFromMeta(
  meta: {
    cookieId?: string;
    ipAddress?: string;
    userAgent?: string;
  },
  cartSessionId?: string,
): string | null {
  if (meta.cookieId) return meta.cookieId;
  if (cartSessionId) return `sess:${cartSessionId}`;
  const ip = meta.ipAddress ?? "";
  const ua = (meta.userAgent ?? "").slice(0, 120);
  if (!ip && !ua) return null;
  return crypto
    .createHash("sha256")
    .update(`${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

async function visitorSegmentFor(
  userId: mongoose.Types.ObjectId | null,
): Promise<SiteActivityVisitorSegment> {
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

/**
 * Upserts one snapshot per authenticated user or per guest key per local calendar day
 * (server timezone, aligned with admin month filters). Does not throw.
 * Guests are keyed by browser visitor id, cart session id, or IP+UA hash so dev/local works without geo.
 */
export function recordSiteActivitySnapshot(
  req: AuthRequest,
  source: SiteActivitySource,
  opts?: { userIdOverride?: string },
): void {
  void (async () => {
    try {
      const meta = getVisitorMeta(req);
      const cartSession = sanitizeCartSessionHeader(req);
      const { activityDay, dayIso } = localActivityDayAndIso();

      const resolvedUserId =
        opts?.userIdOverride?.trim() ||
        (req.userId && mongoose.Types.ObjectId.isValid(req.userId)
          ? req.userId
          : undefined);

      let dedupeKey: string;
      let userId: mongoose.Types.ObjectId | null = null;
      let identityKey: string;
      let visitorKey: string;

      if (resolvedUserId) {
        userId = new mongoose.Types.ObjectId(resolvedUserId);
        identityKey = `u:${resolvedUserId}`;
        visitorKey = identityKey;
        dedupeKey = `u:${resolvedUserId}:${dayIso}`;
      } else {
        const g = guestKeyFromMeta(meta, cartSession);
        if (!g) return;
        identityKey = `g:${g}`;
        visitorKey = g;
        dedupeKey = `g:${g}:${dayIso}`;
      }

      const visitorSegment = await visitorSegmentFor(userId);
      const ip = meta.ipAddress ?? "";
      const now = new Date();

      await SiteActivityLog.findOneAndUpdate(
        { dedupeKey },
        {
          $setOnInsert: {
            dedupeKey,
            activityDay,
            user: userId,
            identityKey,
            visitorKey,
            firstSeenAt: now,
            hitCount: 0,
          },
          $set: {
            lastSource: source,
            visitorSegment,
            ipAddress: ip || "unknown",
            ...(meta.userAgent && { userAgent: meta.userAgent }),
            ...(meta.referer && { referer: meta.referer }),
            ...(meta.acceptLanguage && { acceptLanguage: meta.acceptLanguage }),
            ...(meta.cookieId && { cookieId: meta.cookieId }),
          },
          $max: { lastSeenAt: now },
          $inc: { hitCount: 1 },
        },
        { upsert: true },
      );

      if (meta.ipAddress && meta.ipAddress !== "unknown") {
        enrichWithGeo(meta.ipAddress)
          .then((geo) => {
            if (Object.keys(geo).length > 0) {
              return SiteActivityLog.updateOne(
                { dedupeKey },
                { $set: geo },
              ).exec();
            }
          })
          .catch(() => {});
      }
    } catch {
      /* non-blocking */
    }
  })();
}
