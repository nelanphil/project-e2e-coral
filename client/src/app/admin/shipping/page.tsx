"use client";
import { getBaseUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";

const api = (path: string, options?: RequestInit) => {
  const base = getBaseUrl();
  const token = getAuthToken();
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
};

export default function AdminShippingPage() {
  const [shippingAmountFlorida, setShippingAmountFlorida] =
    useState<string>("");
  const [shippingAmountOther, setShippingAmountOther] = useState<string>("");
  const [freeShippingThreshold, setFreeShippingThreshold] =
    useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    api("/api/admin/shipping")
      .then((r) => r.json())
      .then((d) => {
        setShippingAmountFlorida(
          ((d.shippingAmountFlorida ?? 0) / 100).toFixed(2),
        );
        setShippingAmountOther(((d.shippingAmountOther ?? 0) / 100).toFixed(2));
        setFreeShippingThreshold(
          ((d.freeShippingThresholdCents ?? 0) / 100).toFixed(2),
        );
      })
      .catch(() =>
        setMessage({ type: "error", text: "Failed to load settings" }),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const floridaCents = Math.round(
      parseFloat(shippingAmountFlorida || "0") * 100,
    );
    const otherCents = Math.round(parseFloat(shippingAmountOther || "0") * 100);
    const thresholdCents = Math.round(
      parseFloat(freeShippingThreshold || "0") * 100,
    );
    if (floridaCents < 0 || otherCents < 0 || thresholdCents < 0) {
      setMessage({ type: "error", text: "Amounts must be 0 or greater." });
      setSaving(false);
      return;
    }
    try {
      const res = await api("/api/admin/shipping", {
        method: "PUT",
        body: JSON.stringify({
          shippingAmountFlorida: floridaCents,
          shippingAmountOther: otherCents,
          freeShippingThresholdCents: thresholdCents,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setMessage({ type: "success", text: "Shipping rates saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center min-h-[400px] items-center">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="text-2xl font-bold">Shipping</h1>
          <p className="text-base-content/80">
            Set flat shipping rates by destination. When configured, these rates
            are used at checkout instead of live carrier rates.
          </p>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-8 max-w-xl">
            {message && (
              <div
                className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
                <span>{message.text}</span>
              </div>
            )}

            {/* Flat Shipping Rates */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
                Flat shipping rates
              </h3>

              <div className="space-y-4">
                <div className="form-control">
                  <label
                    className="label py-0 mb-1"
                    htmlFor="shipping-florida">
                    <span className="label-text font-medium">
                      Shipping for Florida
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/60">$</span>
                      <input
                        id="shipping-florida"
                        type="number"
                        min="0"
                        step="0.01"
                        className="input input-bordered w-28"
                        value={shippingAmountFlorida}
                        onChange={(e) =>
                          setShippingAmountFlorida(e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <span className="text-sm text-base-content/60">
                      Flat rate for orders shipping to Florida addresses.
                    </span>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label py-0 mb-1" htmlFor="shipping-other">
                    <span className="label-text font-medium">
                      Shipping for other states
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/60">$</span>
                      <input
                        id="shipping-other"
                        type="number"
                        min="0"
                        step="0.01"
                        className="input input-bordered w-28"
                        value={shippingAmountOther}
                        onChange={(e) =>
                          setShippingAmountOther(e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <span className="text-sm text-base-content/60">
                      Flat rate for orders shipping to all states outside
                      Florida.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Free Shipping Threshold */}
            <div className="space-y-4 border-t border-base-300 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
                Free shipping threshold
              </h3>

              <div className="form-control">
                <label
                  className="label py-0 mb-1"
                  htmlFor="free-shipping-threshold">
                  <span className="label-text font-medium">
                    Free shipping on orders over
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/60">$</span>
                    <input
                      id="free-shipping-threshold"
                      type="number"
                      min="0"
                      step="0.01"
                      className="input input-bordered w-28"
                      value={freeShippingThreshold}
                      onChange={(e) =>
                        setFreeShippingThreshold(e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <span className="text-sm text-base-content/60">
                    Orders with a subtotal at or above this amount receive free
                    shipping. Set to $0.00 to disable.
                  </span>
                </div>
              </div>

              <p className="text-sm text-base-content/60">
                Leave both at $0.00 to use live carrier rates (Shippo) when
                configured.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save shipping rates"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
