"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type { CreateUserResponse } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

export default function AdminCreateUserPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"customer" | "admin">("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          role,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error || "Failed to create user",
        );
      }
      const json = (await res.json()) as CreateUserResponse;
      const msg = json.emailSent
        ? `User created! A temporary password was emailed to ${json.user.email}.`
        : "User created, but the email could not be sent. Please share login credentials manually.";
      setSuccess(msg);
      setTimeout(() => router.push("/admin/users"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back navigation */}
      <Link href="/admin/users" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="size-4" /> Back to Users
      </Link>

      {/* Page heading */}
      <h1 className="text-2xl font-bold">Create New User</h1>

      {/* Form card */}
      <div className="card bg-base-100 shadow max-w-xl">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First + Last name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label" htmlFor="create-first-name">
                  <span className="label-text font-medium">First Name</span>
                </label>
                <input
                  id="create-first-name"
                  type="text"
                  placeholder="First name"
                  className="input input-bordered w-full"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label" htmlFor="create-last-name">
                  <span className="label-text font-medium">Last Name</span>
                </label>
                <input
                  id="create-last-name"
                  type="text"
                  placeholder="Last name"
                  className="input input-bordered w-full"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label" htmlFor="create-email">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                className="input input-bordered w-full"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="create-role">
                <span className="label-text font-medium">Role</span>
              </label>
              <select
                id="create-role"
                className="select select-bordered w-full"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "customer" | "admin")
                }
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && (
              <div className="alert alert-error text-sm py-2">{error}</div>
            )}
            {success && (
              <div className="alert alert-success text-sm py-2">{success}</div>
            )}

            <div className="divider m-0" />

            <div className="flex justify-end gap-3">
              <Link href="/admin/users" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Create User"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
