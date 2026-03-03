import { fetchApi } from "@/lib/api-server";

const FALLBACK_TEXT =
  "Welcome to Coral Store - Free shipping on orders over $50 - New arrivals every week";

interface TickerItem {
  _id: string;
  text: string;
}

export async function TickerBanner() {
  let tickerText = FALLBACK_TEXT;

  try {
    const data = await fetchApi<{ items: TickerItem[] }>("/api/ticker-items");
    if (data.items && data.items.length > 0) {
      tickerText = data.items.map((item) => item.text).join(" \u2736 ");
    }
  } catch {
    // fall back to hardcoded text
  }

  return (
    <div
      className="h-10 overflow-hidden bg-primary text-primary-content"
      aria-hidden="true"
    >
      <div className="flex h-full w-max animate-ticker items-center">
        <span className="whitespace-nowrap px-4">{tickerText}</span>
        <span className="whitespace-nowrap px-4">{tickerText}</span>
        <span className="whitespace-nowrap px-4">{tickerText}</span>
        <span className="whitespace-nowrap px-4">{tickerText}</span>
      </div>
    </div>
  );
}
