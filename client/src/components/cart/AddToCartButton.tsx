"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";

export function AddToCartButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

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
      disabled={loading}
    >
      {loading ? "Adding…" : "Add to cart"}
    </button>
  );
}
