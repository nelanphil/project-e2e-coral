"use client";

const TICKER_TEXT =
  "Welcome to Coral Store - Free shipping on orders over $50 - New arrivals every week";

export function TickerBanner() {
  return (
    <div
      className="h-10 overflow-hidden bg-primary text-primary-content"
      aria-hidden="true"
    >
      <div className="flex h-full w-max animate-ticker items-center">
        <span className="whitespace-nowrap px-4">{TICKER_TEXT}</span>
        <span className="whitespace-nowrap px-4">{TICKER_TEXT}</span>
      </div>
    </div>
  );
}
