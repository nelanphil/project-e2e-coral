import { getBaseUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { getVisitorId } from "@/lib/visitor";

const CART_SESSION_STORAGE_KEY = "cart_session_id";

/** One lightweight ping per browser session on the storefront to seed SiteActivityLog. */
export function pingSiteActivityOncePerSession(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return;
  if (sessionStorage.getItem("site_activity_session_ping")) return;
  sessionStorage.setItem("site_activity_session_ping", "1");

  const base = getBaseUrl();
  const token = getAuthToken();
  const visitorId = getVisitorId();
  const cartSession = localStorage.getItem(CART_SESSION_STORAGE_KEY);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (visitorId) headers["X-Cookie-Id"] = visitorId;
  if (cartSession?.trim()) headers["X-Cart-Session"] = cartSession.trim();

  void fetch(`${base}/api/site-activity/ping`, {
    method: "POST",
    headers,
  }).catch(() => {});
}
