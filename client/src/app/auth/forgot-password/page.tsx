"use client";
import { getBaseUrl } from "@/lib/api";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      const emailParam = encodeURIComponent(email.trim().toLowerCase());
      const redirectQuery =
        safeRedirect !== null
          ? `&redirect=${encodeURIComponent(safeRedirect)}`
          : "";
      router.push(`/auth/reset-password?email=${emailParam}${redirectQuery}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const loginHref =
    safeRedirect !== null
      ? `/auth/login?redirect=${encodeURIComponent(safeRedirect)}`
      : "/auth/login";

  return (
    <main className="container mx-auto px-4 py-12 max-w-md">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center">Forgot password</h1>
          <p className="text-sm text-base-content/80 text-center">
            Enter your email and we&apos;ll send a 6-digit code if an account exists.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && <p className="text-error text-sm">{error}</p>}
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Sending…" : "Continue"}
            </button>
          </form>
          <p className="text-center text-sm text-base-content/80 mt-2">
            <Link href={loginHref} className="link">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-12 max-w-md">
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
