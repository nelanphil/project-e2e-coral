"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { X } from "lucide-react";
import { CartContent } from "@/components/cart/CartContent";

type CartDrawerContextValue = {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function useCartDrawer(): CartDrawerContextValue {
  const ctx = useContext(CartDrawerContext);
  if (!ctx)
    throw new Error("useCartDrawer must be used within CartDrawerProvider");
  return ctx;
}

export function CartDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeCart]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  return (
    <CartDrawerContext.Provider value={{ isOpen, openCart, closeCart }}>
      {children}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            role="button"
            tabIndex={0}
            aria-label="Close cart"
            onClick={closeCart}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeCart();
            }}
          />
          <aside
            className="fixed right-0 top-0 z-50 flex h-full w-[calc(100%-4rem)] max-w-md flex-col bg-base-200 shadow-xl lg:w-full"
            aria-label="Cart"
          >
            <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
              <h2 className="text-lg font-semibold">Cart</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Close cart"
                onClick={closeCart}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CartContent onClose={closeCart} />
            </div>
          </aside>
        </>
      )}
    </CartDrawerContext.Provider>
  );
}
