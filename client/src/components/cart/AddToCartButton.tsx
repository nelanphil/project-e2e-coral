"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";

export function AddToCartButton({
  productId,
  availableQuantity,
  className,
}: {
  productId: string;
  availableQuantity?: number;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const cartQuantity = useCartStore((s) =>
    s.items.find((i) => i.productId === productId)?.quantity ?? 0
  );
  const outOfStock =
    availableQuantity !== undefined &&
    (availableQuantity - cartQuantity) <= 0;

  async function handleAdd() {
    setLoading(true);
    try {
      await addItem(productId, 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-primary ${className ?? "mt-6"}`}
      onClick={handleAdd}
      disabled={loading || outOfStock}
    >
      {loading ? "Adding…" : outOfStock ? "Out of stock" : "Add to cart"}
    </button>
  );
}
