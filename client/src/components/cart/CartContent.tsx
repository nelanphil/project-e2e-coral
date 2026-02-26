"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/lib/types";

type CartContentProps = { onClose?: () => void };

export function CartContent({ onClose }: CartContentProps = {}) {
  const { items, loading, removeItem } = useCartStore();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="mt-4 text-sm text-base-content/70">Loading cart…</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-base-content/80 mb-4">Your cart is empty.</p>
        <Link href="/store" className="btn btn-primary btn-sm" onClick={onClose}>
          Continue shopping
        </Link>
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col">
      <ul className="space-y-3 overflow-y-auto">
        {items.map((item: CartItem) => (
          <li key={item.productId}>
            <div className="flex flex-col gap-2 rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="relative aspect-square w-full max-w-[140px] mx-auto overflow-hidden rounded-lg bg-base-200">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <Link
                href={`/coral/${item.slug}`}
                className="link link-hover font-medium text-center line-clamp-2"
                onClick={onClose}
              >
                {item.name}
              </Link>
              <div className="flex items-center justify-between text-sm">
                <span className="text-base-content/70">
                  ${(item.price / 100).toFixed(2)} × {item.quantity}
                </span>
                <span className="font-medium">
                  ${((item.price * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-block text-error hover:text-error"
                onClick={() => removeItem(item.productId)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-base-300 pt-4 shrink-0">
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-base font-medium text-base-content/80">Subtotal</span>
          <span className="text-xl font-bold">${(total / 100).toFixed(2)}</span>
        </div>
        <Link
          href="/checkout"
          className="btn btn-primary w-full"
          onClick={onClose}
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
