import { getBaseUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const adminFetch = (path: string) => {
  const base = getBaseUrl();
  const token = getAuthToken();
  return fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const LOCALHOST_IPS = /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1|localhost)$/i;

type GeoItem = {
  geoCity?: string;
  geoRegion?: string;
  geoCountry?: string;
  ipAddress?: string;
};

export function formatVisitorInfo(item: GeoItem): string {
  const parts: string[] = [];
  if (item.geoCity || item.geoRegion) {
    parts.push([item.geoCity, item.geoRegion].filter(Boolean).join(", "));
  }
  if (item.geoCountry) parts.push(item.geoCountry);
  if (parts.length > 0) return parts.join(", ");
  if (item.ipAddress) {
    return LOCALHOST_IPS.test(item.ipAddress.trim()) ? "Local" : item.ipAddress;
  }
  return "—";
}
