import mongoose, { Schema, model } from "mongoose";

export type SiteActivitySource = "cart" | "checkout" | "ping";

export type SiteActivityVisitorSegment =
  | "anonymous"
  | "guest_user"
  | "customer"
  | "admin";

export interface ISiteActivityLog {
  _id: mongoose.Types.ObjectId;
  /** One row per identity per local calendar day (server timezone). */
  dedupeKey: string;
  activityDay: Date;
  user?: mongoose.Types.ObjectId | null;
  /** `u:userId` for authenticated users; `g:…` for guests (cookie or hash). */
  identityKey: string;
  visitorKey: string;
  /** Resolved from User.role when logged in; anonymous for cookie/session-only guests. */
  visitorSegment?: SiteActivityVisitorSegment;
  ipAddress: string;
  userAgent?: string;
  referer?: string;
  acceptLanguage?: string;
  cookieId?: string;
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  lastSource: SiteActivitySource;
  firstSeenAt: Date;
  lastSeenAt: Date;
  hitCount: number;
}

const siteActivityLogSchema = new Schema<ISiteActivityLog>(
  {
    dedupeKey: { type: String, required: true, unique: true },
    activityDay: { type: Date, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    identityKey: { type: String, required: true, index: true },
    visitorKey: { type: String, required: true },
    visitorSegment: {
      type: String,
      enum: ["anonymous", "guest_user", "customer", "admin"],
      index: true,
    },
    ipAddress: { type: String, required: true },
    userAgent: { type: String },
    referer: { type: String },
    acceptLanguage: { type: String },
    cookieId: { type: String },
    geoCountry: { type: String },
    geoRegion: { type: String },
    geoCity: { type: String },
    lastSource: {
      type: String,
      enum: ["cart", "checkout", "ping"],
      required: true,
    },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    hitCount: { type: Number, required: true, default: 1 },
  },
  { timestamps: false },
);

siteActivityLogSchema.index({ activityDay: 1, identityKey: 1 });
siteActivityLogSchema.index({ activityDay: 1, geoCountry: 1, geoRegion: 1 });

export const SiteActivityLog =
  mongoose.models.SiteActivityLog ??
  model<ISiteActivityLog>("SiteActivityLog", siteActivityLogSchema);
