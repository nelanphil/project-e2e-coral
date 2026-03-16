"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Eye, Search, Users, ShieldCheck, UserCog } from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type { AdminUsersResponse, AdminUserRoleCounts } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

const emptyCounts: AdminUserRoleCounts = {
  total: 0,
  customer: 0,
  admin: 0,
  guest: 0,
};

function getRoleBadge(role: string) {
  const map: Record<string, string> = {
    admin: "badge-error",
    customer: "badge-primary",
    guest: "badge-ghost",
  };
  return map[role] ?? "badge-ghost";
}

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUsersResponse>({
    users: [],
    total: 0,
    page: 1,
    limit: 50,
    counts: emptyCounts,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (role) params.set("role", role);

      const res = await fetch(`${BASE_URL}/api/admin/users?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = (await res.json()) as AdminUsersResponse;
      setData(json);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleRoleFilter = (filterRole: string) => {
    setRole((prev) => (prev === filterRole ? "" : filterRole));
    setPage(1);
  };

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="space-y-4">
      {/* Role summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          type="button"
          className={`card bg-base-100 shadow cursor-pointer transition-all text-left ${role === "" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => { setRole(""); setPage(1); }}
        >
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <Users className="size-5 text-base-content/50" />
              <span className="text-2xl font-bold">{data.counts.total}</span>
            </div>
            <p className="text-sm text-base-content/60">All Users</p>
          </div>
        </button>
        <button
          type="button"
          className={`card bg-base-100 shadow cursor-pointer transition-all text-left ${role === "customer" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => handleRoleFilter("customer")}
        >
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <UserCog className="size-5 text-primary/60" />
              <span className="text-2xl font-bold">{data.counts.customer}</span>
            </div>
            <p className="text-sm text-base-content/60">Customers</p>
          </div>
        </button>
        <button
          type="button"
          className={`card bg-base-100 shadow cursor-pointer transition-all text-left ${role === "admin" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => handleRoleFilter("admin")}
        >
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <ShieldCheck className="size-5 text-error/60" />
              <span className="text-2xl font-bold">{data.counts.admin}</span>
            </div>
            <p className="text-sm text-base-content/60">Admins</p>
          </div>
        </button>
        <button
          type="button"
          className={`card bg-base-100 shadow cursor-pointer transition-all text-left ${role === "guest" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => handleRoleFilter("guest")}
        >
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <Users className="size-5 text-base-content/30" />
              <span className="text-2xl font-bold">{data.counts.guest}</span>
            </div>
            <p className="text-sm text-base-content/60">Guests</p>
          </div>
        </button>
      </div>

      {/* Search bar */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="size-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="grow"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-4">
          {/* Top pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="text-base-content/60">
              Showing {data.users.length} of {data.total} users
            </div>
            <div className="flex items-center gap-2">
              <select
                className="select select-bordered select-xs"
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              >
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={150}>150 / page</option>
                <option value={250}>250 / page</option>
              </select>
              <div className="join">
                <button
                  type="button"
                  className="join-item btn btn-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  &laquo;
                </button>
                <button type="button" className="join-item btn btn-xs btn-disabled">
                  {page} / {totalPages || 1}
                </button>
                <button
                  type="button"
                  className="join-item btn btn-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  &raquo;
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <span className="loading loading-spinner" />
            </div>
          ) : data.users.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              No users found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th className="text-center">Role</th>
                    <th className="text-right">Points</th>
                    <th>Last Visit</th>
                    <th>Joined</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user._id} className="hover">
                      <td>
                        <span className="font-medium text-sm">
                          {user.name || (
                            <span className="text-base-content/40 italic">No name</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm">
                          {user.email || (
                            <span className="text-base-content/40 italic">&mdash;</span>
                          )}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`badge badge-sm ${getRoleBadge(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="text-right font-mono text-sm">
                        {user.pointsBalance ?? 0}
                      </td>
                      <td>
                        {user.lastVisit ? (
                          <div className="text-sm">
                            {new Date(user.lastVisit).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        ) : (
                          <span className="text-base-content/40">&mdash;</span>
                        )}
                      </td>
                      <td>
                        <div className="text-sm">
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="text-center">
                        <Link
                          href={`/admin/users/${user._id}`}
                          className="btn btn-ghost btn-xs btn-square"
                          aria-label="View user details"
                        >
                          <Eye className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom pagination */}
          {data.users.length > 0 && (
            <div className="flex justify-end">
              <div className="join">
                <button
                  type="button"
                  className="join-item btn btn-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  &laquo;
                </button>
                <button type="button" className="join-item btn btn-xs btn-disabled">
                  {page} / {totalPages || 1}
                </button>
                <button
                  type="button"
                  className="join-item btn btn-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  &raquo;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
