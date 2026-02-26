const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

export async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  // Next.js 15: cannot mix `cache` and `next.revalidate` in the same fetch call.
  // Only inject the default revalidate when the caller hasn't set an explicit cache mode.
  const hasExplicitCache = !!(options as Record<string, unknown> | undefined)
    ?.cache;
  const res = await fetch(url, {
    ...(hasExplicitCache ? {} : { next: { revalidate: 60 } }),
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  } as RequestInit);
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<T>;
}
