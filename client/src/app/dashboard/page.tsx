"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/auth";
import { Mail, User, Shield, Lock, Eye, EyeOff } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

export default function DashboardPage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    setPwLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ||
            "Failed to change password",
        );
      }
      setPwSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Account Details</h1>
        <p className="text-base-content/70 mt-2 text-sm sm:text-base">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Account Information Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-lg sm:text-xl mb-4">
              Account Information
            </h2>
            <div className="divider my-2"></div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="bg-primary text-primary-content rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-base-content/70">
                    Email Address
                  </div>
                  <div className="font-semibold text-sm sm:text-base truncate">
                    {user?.email || "N/A"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="bg-secondary text-secondary-content rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-base-content/70">
                    Full Name
                  </div>
                  <div className="font-semibold text-sm sm:text-base">
                    {[user?.firstName, user?.lastName]
                      .filter(Boolean)
                      .join(" ") || "Not set"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="bg-accent text-accent-content rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-base-content/70">
                    Account Role
                  </div>
                  <div className="font-semibold text-sm sm:text-base capitalize">
                    {user?.role || "N/A"}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-actions justify-end mt-6">
              <button className="btn btn-primary btn-sm w-full sm:w-auto">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-lg sm:text-xl mb-4">
              <Lock className="w-5 h-5" /> Security
            </h2>
            <div className="divider my-2"></div>

            <form
              onSubmit={handleChangePassword}
              className="space-y-4 max-w-md"
            >
              {pwError && (
                <div className="alert alert-error text-sm py-2">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="alert alert-success text-sm py-2">
                  {pwSuccess}
                </div>
              )}

              <div className="form-control">
                <label className="label" htmlFor="current-password">
                  <span className="label-text font-medium">
                    Current Password
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrent ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => setShowCurrent(!showCurrent)}
                    tabIndex={-1}
                  >
                    {showCurrent ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label" htmlFor="new-password">
                  <span className="label-text font-medium">New Password</span>
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => setShowNew(!showNew)}
                    tabIndex={-1}
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <label className="label">
                  <span className="label-text-alt">Minimum 8 characters</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label" htmlFor="confirm-password">
                  <span className="label-text font-medium">
                    Confirm New Password
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-full sm:w-auto"
                  disabled={pwLoading}
                >
                  {pwLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
