"use client";
import { getBaseUrl } from "@/lib/api";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";
  const redirectTo = searchParams.get("redirect");
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : null;

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const forgotHref =
    safeRedirect !== null
      ? `/auth/forgot-password?redirect=${encodeURIComponent(safeRedirect)}`
      : "/auth/forgot-password";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!emailFromQuery) {
      setError("Email is missing. Start again from forgot password.");
      return;
    }
    const digitsOnly = code.replace(/\D/g, "");
    if (digitsOnly.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailFromQuery,
          code: digitsOnly,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Reset failed");
        return;
      }
      const loginQuery = new URLSearchParams();
      loginQuery.set("passwordReset", "1");
      if (safeRedirect !== null) {
        loginQuery.set("redirect", safeRedirect);
      }
      router.push(`/auth/login?${loginQuery.toString()}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!emailFromQuery) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl justify-center">Reset password</h1>
            <p className="text-sm text-base-content/80 text-center">
              Open the link from your reset email, or enter your email on the forgot
              password page first.
            </p>
            <Link href={forgotHref} className="btn btn-primary w-full mt-4">
              Forgot password
            </Link>
            <p className="text-center text-sm text-base-content/80 mt-2">
              <Link href="/auth/login" className="link">
                Back to log in
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-md">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center">Reset password</h1>
          <p className="text-sm text-base-content/80 text-center break-all">
            Code sent to <strong>{emailFromQuery}</strong>
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && <p className="text-error text-sm">{error}</p>}
            <div>
              <label className="label" htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="input input-bordered w-full text-center text-xl tracking-widest font-mono"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="newPassword">
                New password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
          <p className="text-center text-sm text-base-content/80 mt-2">
            <Link href={forgotHref} className="link">
              Resend code
            </Link>
            {" · "}
            <Link href="/auth/login" className="link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
