const getBaseUrl = () => {
  if (typeof window !== "undefined")
    return process.env.NEXT_PUBLIC_API_URL || "";
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004";
};

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<T>;
}

export async function apiWithCartSession<T>(
  path: string,
  options?: RequestInit & { cartSessionId?: string | null },
): Promise<T> {
  const { cartSessionId, ...rest } = options ?? {};
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...rest.headers,
  };
  if (cartSessionId)
    (headers as Record<string, string>)["X-Cart-Session"] = cartSessionId;
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...rest, headers });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<T>;
}
