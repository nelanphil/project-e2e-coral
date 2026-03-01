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

function getIpAddress(req: {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
}): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim() || undefined;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = forwarded[0];
    return (typeof first === "string" ? first : String(first)).split(",")[0].trim() || undefined;
  }
  return req.socket?.remoteAddress;
}

function getHeader(req: { headers: Record<string, string | string[] | undefined> }, name: string): string | undefined {
  const val = req.headers[name];
  if (typeof val === "string") return val.trim() || undefined;
  if (Array.isArray(val) && val.length > 0) {
    const v = val[0];
    return (typeof v === "string" ? v : String(v)).trim() || undefined;
  }
  return undefined;
}

export function getVisitorMeta(req: Request): VisitorMeta {
  const ip = getIpAddress(req);
  const userAgent = getHeader(req, "user-agent");
  const referer = getHeader(req, "referer");
  const acceptLanguage = getHeader(req, "accept-language");
  const cookieId = getHeader(req, "x-cookie-id");

  return {
    ...(ip && { ipAddress: ip }),
    ...(userAgent && { userAgent }),
    ...(referer && { referer }),
    ...(acceptLanguage && { acceptLanguage }),
    ...(cookieId && { cookieId }),
  };
}

const LOCALHOST_PATTERNS = /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1|localhost)$/i;

export async function enrichWithGeo(ip: string | undefined): Promise<GeoMeta> {
  if (!ip || LOCALHOST_PATTERNS.test(ip.trim())) {
    return {};
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,regionName,city`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { country?: string; regionName?: string; city?: string };
    return {
      ...(data.country && { geoCountry: data.country }),
      ...(data.regionName && { geoRegion: data.regionName }),
      ...(data.city && { geoCity: data.city }),
    };
  } catch {
    return {};
  }
}
