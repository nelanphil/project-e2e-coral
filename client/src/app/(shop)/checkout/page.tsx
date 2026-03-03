"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCartSessionId } from "@/lib/cart/cart-session";
import { getAuthToken } from "@/lib/auth";
import { getVisitorId } from "@/lib/visitor";
import { useAuth } from "@/lib/auth-context";
import { useCartStore } from "@/stores/cart-store";
import { validatePostalCodeMatchesState } from "@/lib/address-validation";

type AddressFields = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyAddress: AddressFields = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function AddressForm({
  address,
  onChange,
  prefix,
  validationError,
}: {
  address: AddressFields;
  onChange: (a: AddressFields) => void;
  prefix: string;
  validationError?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor={`${prefix}-line1`}>
          Address line 1
        </label>
        <input
          id={`${prefix}-line1`}
          type="text"
          className="input input-bordered w-full"
          value={address.line1}
          onChange={(e) => onChange({ ...address, line1: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-line2`}>
          Address line 2
        </label>
        <input
          id={`${prefix}-line2`}
          type="text"
          className="input input-bordered w-full"
          value={address.line2}
          onChange={(e) => onChange({ ...address, line2: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor={`${prefix}-city`}>
            City
          </label>
          <input
            id={`${prefix}-city`}
            type="text"
            className="input input-bordered w-full"
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-state`}>
            State
          </label>
          <input
            id={`${prefix}-state`}
            type="text"
            className="input input-bordered w-full"
            value={address.state}
            onChange={(e) => onChange({ ...address, state: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor={`${prefix}-postalCode`}>
            Postal code
          </label>
          <input
            id={`${prefix}-postalCode`}
            type="text"
            className="input input-bordered w-full"
            value={address.postalCode}
            onChange={(e) =>
              onChange({ ...address, postalCode: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-country`}>
            Country
          </label>
          <input
            id={`${prefix}-country`}
            type="text"
            className="input input-bordered w-full"
            value={address.country}
            onChange={(e) => onChange({ ...address, country: e.target.value })}
            required
          />
        </div>
      </div>
      {validationError && (
        <p className="text-error text-sm">{validationError}</p>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const items = useCartStore((s) => s.items);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] =
    useState<AddressFields>(emptyAddress);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shippingAddress, setShippingAddress] =
    useState<AddressFields>(emptyAddress);
  const [taxAmount, setTaxAmount] = useState<number | null>(null);
  const [shippingRates, setShippingRates] = useState<
    {
      objectId: string;
      provider: string;
      servicelevel: { name: string };
      amount: string;
      durationTerms?: string;
    }[]
  >([]);
  const [selectedRate, setSelectedRate] = useState<{
    objectId: string;
    amountCents: number;
  } | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [pointsToCents, setPointsToCents] = useState<number>(100);
  const [pointsPerDollar, setPointsPerDollar] = useState<number>(10);
  const [pointsToApply, setPointsToApply] = useState<number>(0);
  const [emailExists, setEmailExists] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [discountAmountCents, setDiscountAmountCents] = useState(0);
  const [discountType, setDiscountType] = useState<
    "product" | "shipping" | null
  >(null);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);
  const taxFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shippingFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced email existence check for guest checkout
  useEffect(() => {
    if (user || !isValidEmail(email)) {
      setEmailExists(false);
      setEmailCheckLoading(false);
      return;
    }
    setEmailCheckLoading(true);
    const t = setTimeout(async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
        const res = await fetch(`${baseUrl}/api/auth/check-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        setEmailExists(!!data.exists);
      } catch {
        setEmailExists(false);
      }
      setEmailCheckLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [email, user]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const effectiveShippingAddress = useMemo(
    () => (shippingSameAsBilling ? billingAddress : shippingAddress),
    [shippingSameAsBilling, billingAddress, shippingAddress],
  );
  const shippingAmount = selectedRate?.amountCents ?? 0;
  const billingValidationError = useMemo(() => {
    if (!billingAddress.postalCode || !billingAddress.state) return null;
    const result = validatePostalCodeMatchesState(
      billingAddress.postalCode,
      billingAddress.state,
      billingAddress.country,
    );
    return result.valid ? null : (result.message ?? null);
  }, [billingAddress.postalCode, billingAddress.state, billingAddress.country]);
  const shippingValidationError = useMemo(() => {
    if (shippingSameAsBilling) return null;
    if (!shippingAddress.postalCode || !shippingAddress.state) return null;
    const result = validatePostalCodeMatchesState(
      shippingAddress.postalCode,
      shippingAddress.state,
      shippingAddress.country,
    );
    return result.valid ? null : (result.message ?? null);
  }, [
    shippingSameAsBilling,
    shippingAddress.postalCode,
    shippingAddress.state,
    shippingAddress.country,
  ]);

  useEffect(() => {
    const state = effectiveShippingAddress.state?.toUpperCase().trim();
    const zip = effectiveShippingAddress.postalCode
      ?.replace(/\D/g, "")
      .slice(0, 5);
    if (state !== "FL" || !zip || zip.length !== 5) {
      const t = setTimeout(() => setTaxAmount(0), 0);
      return () => clearTimeout(t);
    }
    if (taxFetchRef.current) clearTimeout(taxFetchRef.current);
    taxFetchRef.current = setTimeout(async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
        const res = await fetch(`${baseUrl}/api/checkout/tax-estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: effectiveShippingAddress.state,
            postalCode: zip,
            subtotal,
          }),
        });
        const data = await res.json().catch(() => ({}));
        setTaxAmount(typeof data.amount === "number" ? data.amount : 0);
      } catch {
        setTaxAmount(0);
      }
      taxFetchRef.current = null;
    }, 300);
    return () => {
      if (taxFetchRef.current) clearTimeout(taxFetchRef.current);
    };
  }, [effectiveShippingAddress, subtotal]);

  useEffect(() => {
    const addr = effectiveShippingAddress;
    if (
      !addr.line1 ||
      !addr.city ||
      !addr.state ||
      !addr.postalCode ||
      !addr.country
    ) {
      const t = setTimeout(() => {
        setShippingRates([]);
        setSelectedRate(null);
      }, 0);
      return () => clearTimeout(t);
    }
    if (shippingFetchRef.current) clearTimeout(shippingFetchRef.current);
    shippingFetchRef.current = setTimeout(async () => {
      setShippingLoading(true);
      try {
        const sessionId = getCartSessionId();
        if (!sessionId) {
          setShippingRates([]);
          setSelectedRate(null);
          setShippingLoading(false);
          return;
        }
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
        const res = await fetch(`${baseUrl}/api/checkout/shipping-rates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Cart-Session": sessionId,
          },
          body: JSON.stringify({ shippingAddress: addr }),
        });
        const data = await res.json().catch(() => ({}));
        const rates = Array.isArray(data.rates) ? data.rates : [];
        setShippingRates(rates);
        if (rates.length > 0) {
          const cheapest = rates.reduce(
            (a: { amount: string }, b: { amount: string }) =>
              parseFloat(a.amount) < parseFloat(b.amount) ? a : b,
          );
          const amountCents = Math.round(parseFloat(cheapest.amount) * 100);
          setSelectedRate({ objectId: cheapest.objectId, amountCents });
        } else {
          setSelectedRate(null);
        }
      } catch {
        setShippingRates([]);
        setSelectedRate(null);
      }
      setShippingLoading(false);
      shippingFetchRef.current = null;
    }, 400);
    return () => {
      if (shippingFetchRef.current) clearTimeout(shippingFetchRef.current);
    };
  }, [effectiveShippingAddress]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
    fetch(`${baseUrl}/api/rewards/settings`)
      .then((r) => r.json())
      .then((d) => {
        setPointsToCents(d.pointsToCents ?? 100);
        setPointsPerDollar(d.pointsPerDollar ?? 10);
      })
      .catch(() => {
        setPointsToCents(100);
        setPointsPerDollar(10);
      });
  }, []);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
    const token = getAuthToken();
    fetch(`${baseUrl}/api/admin/shipping`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.freeShippingThresholdCents === "number") {
          setFreeShippingThreshold(d.freeShippingThresholdCents);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        setPointsBalance(null);
        setPointsToApply(0);
      }, 0);
      return () => clearTimeout(t);
    }
    const token = getAuthToken();
    if (!token) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
    fetch(`${baseUrl}/api/rewards/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { pointsBalance: 0 }))
      .then((d) => {
        setPointsBalance(d.pointsBalance ?? 0);
        setPointsToApply((prev) => Math.min(prev, d.pointsBalance ?? 0));
      })
      .catch(() => setPointsBalance(0));
  }, [user]);

  const freeShippingApplied =
    freeShippingThreshold > 0 &&
    subtotal >= freeShippingThreshold &&
    discountType !== "shipping";
  const effectiveShippingAmount = freeShippingApplied
    ? 0
    : discountType === "shipping"
      ? Math.max(0, shippingAmount - discountAmountCents)
      : shippingAmount;
  const productDiscountCents =
    discountType === "product" ? discountAmountCents : 0;
  const orderTotalBeforePoints =
    subtotal -
    productDiscountCents +
    effectiveShippingAmount +
    (taxAmount ?? 0);
  const maxRedeemableByTotal =
    pointsToCents > 0
      ? Math.floor(orderTotalBeforePoints / (pointsToCents / 100))
      : 0;
  const maxRedeemable =
    pointsBalance !== null ? Math.min(pointsBalance, maxRedeemableByTotal) : 0;
  const pointsDiscountCents =
    pointsToApply > 0 && pointsToCents > 0
      ? Math.floor(pointsToApply * (100 / pointsToCents))
      : 0;
  const orderTotal = orderTotalBeforePoints - pointsDiscountCents;
  const pointsEarned =
    user && pointsPerDollar > 0
      ? Math.floor((orderTotal / 100) * pointsPerDollar)
      : 0;

  async function handleApplyDiscount() {
    const code = discountCodeInput.trim();
    if (!code) return;
    setDiscountLoading(true);
    setDiscountError(null);
    setDiscountMessage(null);
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
      const token = getAuthToken();
      const res = await fetch(`${baseUrl}/api/discounts/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(getVisitorId() && { "X-Cookie-Id": getVisitorId() }),
        },
        body: JSON.stringify({
          code,
          cartItems: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
          })),
          subtotalCents: subtotal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.valid) {
        setDiscountError(data.message ?? "Invalid discount code");
        setDiscountCode(null);
        setDiscountAmountCents(0);
        setDiscountType(null);
      } else {
        setDiscountCode(code.toUpperCase());
        setDiscountAmountCents(data.discountAmountCents ?? 0);
        setDiscountType(data.discountType);
        setDiscountMessage(data.message);
        setDiscountError(null);
      }
    } catch {
      setDiscountError("Failed to validate discount code");
    }
    setDiscountLoading(false);
  }

  function handleRemoveDiscount() {
    setDiscountCode(null);
    setDiscountAmountCents(0);
    setDiscountType(null);
    setDiscountMessage(null);
    setDiscountError(null);
    setDiscountCodeInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!user && !email) {
      setError("Email is required to complete your order.");
      return;
    }
    if (!user && emailExists) {
      setError("An account exists with this email. Please sign in to continue.");
      return;
    }

    const shipping = effectiveShippingAddress;
    if (
      !shipping.line1 ||
      !shipping.city ||
      !shipping.state ||
      !shipping.postalCode ||
      !shipping.country
    ) {
      setError("Please complete the shipping address.");
      return;
    }

    if (billingValidationError) {
      setError("Please correct the billing address.");
      return;
    }
    if (!shippingSameAsBilling && shippingValidationError) {
      setError("Please correct the shipping address.");
      return;
    }

    setLoading(true);
    const sessionId = getCartSessionId();
    if (!sessionId) {
      setError("Cart session missing. Add items from the shop.");
      setLoading(false);
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
    const successUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/checkout/success`
        : "";
    const cancelUrl =
      typeof window !== "undefined" ? `${window.location.origin}/cart` : "";
    const token = getAuthToken();
    try {
      const res = await fetch(`${baseUrl}/api/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cart-Session": sessionId,
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(getVisitorId() && { "X-Cookie-Id": getVisitorId() }),
        },
        body: JSON.stringify({
          paymentMethod: "stripe",
          successUrl,
          cancelUrl,
          shippingAddress: shipping,
          shippingAmount: shippingAmount > 0 ? shippingAmount : undefined,
          email: user ? undefined : email,
          pointsToApply: pointsToApply > 0 ? pointsToApply : undefined,
          discountCode: discountCode ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        setLoading(false);
        return;
      }
      if (data.stripeUrl) {
        window.location.href = data.stripeUrl;
        return;
      }
      setError("No payment URL returned.");
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: address forms */}
        <div className="flex-1">
          <form
            id="checkout-form"
            onSubmit={handleSubmit}
            className="space-y-6">
            {error && <p className="text-error text-sm">{error}</p>}

            {!user && (
              <>
                <section>
                  <h2 className="font-semibold text-lg mb-4">Account</h2>
                  <p className="text-sm text-base-content/80 mb-4">
                    Sign in to use rewards and track your orders, or continue as
                    a guest.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/auth/login?redirect=/checkout"
                      className="btn btn-primary">
                      Sign in
                    </Link>
                    <Link
                      href="/auth/sign-up?redirect=/checkout"
                      className="btn btn-outline">
                      Sign up
                    </Link>
                  </div>
                </section>

                <section>
                  <h2 className="font-semibold text-lg mb-4">Guest checkout</h2>
                  <p className="text-sm text-base-content/80 mb-4">
                    Enter your email to continue as a guest. We&apos;ll use it
                    to send your order confirmation.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="label" htmlFor="email">
                        Email
                      </label>
                      <div className="relative">
                        <input
                          id="email"
                          type="email"
                          className={`input input-bordered w-full ${emailExists ? "input-error" : ""}`}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                        />
                        {emailCheckLoading && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-sm text-base-content/40" />
                        )}
                      </div>
                    </div>
                    {emailExists && (
                      <div className="alert alert-warning py-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium">An account already exists with this email.</p>
                          <p className="text-sm">Please sign in to complete your order and earn rewards.</p>
                        </div>
                        <Link
                          href={`/auth/login?redirect=/checkout`}
                          className="btn btn-sm btn-warning">
                          Sign in
                        </Link>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            <section>
              <h2 className="font-semibold text-lg mb-4">Billing address</h2>
              <AddressForm
                address={billingAddress}
                onChange={setBillingAddress}
                prefix="billing"
                validationError={billingValidationError ?? undefined}
              />
            </section>

            <section>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={shippingSameAsBilling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShippingSameAsBilling(checked);
                    if (!checked) setShippingAddress({ ...billingAddress });
                  }}
                />
                <span>Shipping address same as billing</span>
              </label>
            </section>

            {!shippingSameAsBilling && (
              <section>
                <h2 className="font-semibold text-lg mb-4">Shipping address</h2>
                <AddressForm
                  address={shippingAddress}
                  onChange={setShippingAddress}
                  prefix="shipping"
                  validationError={shippingValidationError ?? undefined}
                />
              </section>
            )}
          </form>
          <p className="mt-4">
            <Link href="/cart" className="link">
              Back to cart
            </Link>
          </p>
        </div>

        {/* Right: cart summary */}
        <div className="lg:w-80">
          <div className="bg-base-200 rounded-lg p-4">
            <h2 className="font-semibold text-lg mb-4">Order summary</h2>
            {items.length === 0 ? (
              <p className="text-sm text-base-content/60">
                Your cart is empty.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="rounded object-cover w-12 h-12 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-base-content/60">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="divider my-3" />
            {shippingRates.length > 1 && (
              <div className="mb-3">
                <label className="label text-xs">Shipping method</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={selectedRate?.objectId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const r = shippingRates.find((x) => x.objectId === id);
                    if (r) {
                      setSelectedRate({
                        objectId: r.objectId,
                        amountCents: Math.round(parseFloat(r.amount) * 100),
                      });
                    }
                  }}>
                  {shippingRates.map((r) => (
                    <option key={r.objectId} value={r.objectId}>
                      {r.servicelevel?.name ?? r.provider} – $
                      {parseFloat(r.amount).toFixed(2)}
                      {r.durationTerms ? ` (${r.durationTerms})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {shippingLoading && effectiveShippingAddress.line1 && (
              <p className="text-sm text-base-content/60 mb-2">
                Loading shipping rates…
              </p>
            )}
            {!shippingLoading &&
              effectiveShippingAddress.line1 &&
              effectiveShippingAddress.postalCode &&
              shippingRates.length === 0 && (
                <p className="text-sm text-warning/80 mb-2">
                  No shipping rates available. Check your address or contact us.
                </p>
              )}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${(subtotal / 100).toFixed(2)}</span>
              </div>
              {shippingAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    {freeShippingApplied ? (
                      <>
                        <span className="line-through text-base-content/40 mr-1">
                          ${(shippingAmount / 100).toFixed(2)}
                        </span>
                        <span className="text-success font-medium">Free</span>
                      </>
                    ) : discountType === "shipping" &&
                      discountAmountCents > 0 ? (
                      <>
                        <span className="line-through text-base-content/40 mr-1">
                          ${(shippingAmount / 100).toFixed(2)}
                        </span>
                        ${(effectiveShippingAmount / 100).toFixed(2)}
                      </>
                    ) : (
                      `$${(shippingAmount / 100).toFixed(2)}`
                    )}
                  </span>
                </div>
              )}
              {freeShippingApplied && (
                <div className="flex justify-between text-sm text-success">
                  <span>🎉 Free shipping applied!</span>
                </div>
              )}
              {effectiveShippingAddress.state?.toUpperCase().trim() === "FL" &&
                taxAmount !== null &&
                taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax (FL)</span>
                    <span>${(taxAmount / 100).toFixed(2)}</span>
                  </div>
                )}
              {/* Discount code input */}
              <div className="pt-2 border-t border-base-300">
                {discountCode ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-success">
                        Code: {discountCode}
                      </span>
                      {discountMessage && (
                        <p className="text-xs text-success">
                          {discountMessage}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={handleRemoveDiscount}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input input-bordered input-sm flex-1"
                        placeholder="Discount code"
                        value={discountCodeInput}
                        onChange={(e) => setDiscountCodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyDiscount();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={handleApplyDiscount}
                        disabled={discountLoading || !discountCodeInput.trim()}>
                        {discountLoading ? "..." : "Apply"}
                      </button>
                    </div>
                    {discountError && (
                      <p className="text-xs text-error">{discountError}</p>
                    )}
                  </div>
                )}
              </div>
              {/* Product discount line item */}
              {discountCode &&
                discountType === "product" &&
                discountAmountCents > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount ({discountCode})</span>
                    <span>-${(discountAmountCents / 100).toFixed(2)}</span>
                  </div>
                )}
              {/* Shipping discount line item */}
              {discountCode &&
                discountType === "shipping" &&
                discountAmountCents > 0 &&
                !freeShippingApplied && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Shipping discount ({discountCode})</span>
                    <span>-${(discountAmountCents / 100).toFixed(2)}</span>
                  </div>
                )}
              {/* Free shipping threshold hint */}
              {freeShippingThreshold > 0 &&
                !freeShippingApplied &&
                subtotal < freeShippingThreshold && (
                  <div className="text-xs text-base-content/60 pt-1">
                    Add ${((freeShippingThreshold - subtotal) / 100).toFixed(2)}{" "}
                    more for free shipping!
                  </div>
                )}
              {user && (
                <div className="flex flex-col gap-2 pt-2 border-t border-base-300">
                  {pointsBalance !== null && pointsBalance > 0 && (
                    <>
                      <p className="text-sm text-base-content/70">
                        You have {pointsBalance.toLocaleString()} points
                        available
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxRedeemable}
                          step={1}
                          className="input input-bordered input-sm w-24"
                          value={pointsToApply || ""}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setPointsToApply(
                              Number.isNaN(v)
                                ? 0
                                : Math.min(maxRedeemable, Math.max(0, v)),
                            );
                          }}
                          placeholder="0"
                        />
                        <span className="text-sm text-base-content/60">
                          points
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPointsToApply(maxRedeemable)}>
                          Use max
                        </button>
                      </div>
                    </>
                  )}
                  {pointsBalance !== null &&
                    pointsBalance > 0 &&
                    pointsToApply > 0 && (
                      <div className="flex justify-between text-sm text-success">
                        <span>Rewards discount</span>
                        <span>-${(pointsDiscountCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                  {pointsEarned > 0 && (
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3 text-center">
                        <p className="text-sm text-base-content font-medium m-0">
                          You&apos;ll earn {pointsEarned.toLocaleString()}{" "}
                          points on this purchase
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2">
                <span>Total</span>
                <span>${(orderTotal / 100).toFixed(2)}</span>
              </div>
            </div>
            <button
              type="submit"
              form="checkout-form"
              className="btn btn-primary w-full mt-4"
              disabled={
                loading ||
                items.length === 0 ||
                !!billingValidationError ||
                (!shippingSameAsBilling && !!shippingValidationError) ||
                (!user && !isValidEmail(email)) ||
                (!user && emailExists)
              }>
              {loading ? "Processing…" : "Continue to payment"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
