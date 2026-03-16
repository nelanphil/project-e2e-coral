"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const FALLBACK_TEXT =
  "Welcome to Coral Store - Free shipping on orders over $50 - New arrivals every week";

const TICKER_CHANNEL = "ticker-banner-update";
const POLL_INTERVAL_MS = 30_000;

interface TickerItem {
  _id: string;
  text: string;
}

function buildTickerText(items: TickerItem[]): string {
  if (items && items.length > 0) {
    return items.map((item) => item.text).join(" \u2736 ");
  }
  return FALLBACK_TEXT;
}

export function TickerBanner() {
  const [tickerText, setTickerText] = useState(FALLBACK_TEXT);

  const fetchTicker = useCallback(async () => {
    try {
      const data = await api<{ items: TickerItem[] }>("/api/ticker-items");
      setTickerText(buildTickerText(data.items ?? []));
    } catch {
      setTickerText(FALLBACK_TEXT);
    }
  }, []);

  useEffect(() => {
    fetchTicker();

    const pollId = setInterval(fetchTicker, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchTicker();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(TICKER_CHANNEL);
      channel.onmessage = () => fetchTicker();
    }

    return () => {
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      channel?.close();
    };
  }, [fetchTicker]);

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
