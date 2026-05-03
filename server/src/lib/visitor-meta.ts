import { isIPv4, isIPv6 } from "node:net";
import type { Request } from "express";

export interface VisitorMeta {
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  acceptLanguage?: string;
  cookieId?: string;
}

export interface GeoMeta {
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
}

const TRUST_PROXY_VALUES = new Set(["1", "true", "yes"]);

/**
 * When false (default), X-Forwarded-For is ignored and the socket address is used
 * so clients cannot spoof an IP. Set TRUST_PROXY=true behind a trusted reverse proxy.
 */
export function trustProxyHeaders(): boolean {
  const v = process.env.TRUST_PROXY?.trim().toLowerCase();
  return v ? TRUST_PROXY_VALUES.has(v) : false;
}

/** Strip ports, IPv6 brackets, IPv4-mapped prefixes; return undefined if not a valid IP. */
export function normalizeClientIp(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim();
  if (s === "") return undefined;
  if (s.startsWith("[") && s.includes("]")) {
    s = s.slice(1, s.indexOf("]"));
  }
  if (s.startsWith("::ffff:")) {
    s = s.slice(7);
  }
  const withPort = s.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d+)$/);
  if (withPort && isIPv4(withPort[1])) {
    s = withPort[1];
  }
  if (s.toLowerCase() === "localhost") return undefined;
  if (!isIPv4(s) && !isIPv6(s)) return undefined;
  return s;
}

function forwardedClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = forwarded[0];
    return (typeof first === "string" ? first : String(first))
      .split(",")[0]
      ?.trim();
  }
  return undefined;
}

/**
 * Resolved client IP for logging and geo. Honors X-Forwarded-For only when TRUST_PROXY is enabled.
 * Falls back to Express `req.ip` when the socket address is missing (some dev / proxy setups).
 */
export function getTrustedClientIp(
  req: {
    headers: Record<string, string | string[] | undefined>;
    socket: { remoteAddress?: string };
    ip?: string;
  },
): string | undefined {
  let raw: string | undefined;
  if (trustProxyHeaders()) {
    raw = forwardedClientIp(req) || req.socket?.remoteAddress;
  } else {
    raw = req.socket?.remoteAddress;
  }
  const normalized = normalizeClientIp(raw);
  if (normalized) return normalized;
  const socketAgain = normalizeClientIp(req.socket?.remoteAddress);
  if (socketAgain) return socketAgain;
  return normalizeClientIp(typeof req.ip === "string" ? req.ip : undefined);
}

function getHeader(
  req: { headers: Record<string, string | string[] | undefined> },
  name: string,
): string | undefined {
  const val = req.headers[name];
  if (typeof val === "string") return val.trim() || undefined;
  if (Array.isArray(val) && val.length > 0) {
    const v = val[0];
    return (typeof v === "string" ? v : String(v)).trim() || undefined;
  }
  return undefined;
}

/** Constrain client-supplied visitor id (sent as X-Cookie-Id) to safe characters (UUIDs + legacy ids). */
const VISITOR_COOKIE_ID_PATTERN = /^[a-zA-Z0-9._-]{8,200}$/;

export function sanitizeVisitorCookieId(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (!VISITOR_COOKIE_ID_PATTERN.test(t)) return undefined;
  return t;
}

/** Cart session ids from the API are Mongo ObjectId hex strings. */
const CART_SESSION_PATTERN = /^[a-f0-9]{24}$/i;

export function sanitizeCartSessionHeader(
  req: { headers: Record<string, string | string[] | undefined> },
): string | undefined {
  const id = req.headers["x-cart-session"];
  const s = Array.isArray(id) ? id[0] : id;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  if (!CART_SESSION_PATTERN.test(t)) return undefined;
  return t;
}

export function getVisitorMeta(req: Request): VisitorMeta {
  const ip = getTrustedClientIp(req);
  const userAgent = getHeader(req, "user-agent");
  const referer = getHeader(req, "referer");
  const acceptLanguage = getHeader(req, "accept-language");
  const cookieId = sanitizeVisitorCookieId(getHeader(req, "x-cookie-id"));

  return {
    ...(ip && { ipAddress: ip }),
    ...(userAgent && { userAgent }),
    ...(referer && { referer }),
    ...(acceptLanguage && { acceptLanguage }),
    ...(cookieId && { cookieId }),
  };
}

const LOCALHOST_IP = /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/i;

export async function enrichWithGeo(ip: string | undefined): Promise<GeoMeta> {
  const n = normalizeClientIp(ip);
  if (!n || LOCALHOST_IP.test(n)) {
    return {};
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(n)}?fields=country,regionName,city`,
      {
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      country?: string;
      regionName?: string;
      city?: string;
    };
    return {
      ...(data.country && { geoCountry: data.country }),
      ...(data.regionName && { geoRegion: data.regionName }),
      ...(data.city && { geoCity: data.city }),
    };
  } catch {
    return {};
  }
}
