const KEY = "cart_session_id";

export function getCartSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setCartSessionId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, id);
}
