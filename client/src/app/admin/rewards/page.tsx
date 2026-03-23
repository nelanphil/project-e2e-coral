"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";

const api = (path: string, options?: RequestInit) => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
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

interface RewardsSettings {
  pointsPerDollar: number;
  pointsToCents: number;
}

interface UserWithPoints {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  pointsBalance: number;
  lastVisit?: string;
}

interface RewardLogEntry {
  _id: string;
  user: { _id: string; email?: string; firstName?: string; lastName?: string };
  type: "earned" | "spent" | "adjusted";
  points: number;
  order?: { _id: string };
  description?: string;
  performedBy?: {
    _id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

export default function AdminRewardsPage() {
  const [, setSettings] = useState<RewardsSettings>({
    pointsPerDollar: 10,
    pointsToCents: 100,
  });
  const [pointsPerDollarInput, setPointsPerDollarInput] =
    useState<string>("10");
  const [pointsToCentsInput, setPointsToCentsInput] = useState<string>("100");
  const [users, setUsers] = useState<UserWithPoints[]>([]);
  const [logs, setLogs] = useState<RewardLogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [adjustEmail, setAdjustEmail] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [listTab, setListTab] = useState<"users" | "logs">("users");

  useEffect(() => {
    Promise.all([
      api("/api/admin/rewards").then((r) => r.json()),
      api("/api/admin/rewards/users").then((r) => r.json()),
      api("/api/admin/rewards/logs?limit=20&page=1").then((r) => r.json()),
    ])
      .then(([settingsRes, usersRes, logsRes]) => {
        setSettings(settingsRes);
        setPointsPerDollarInput(String(settingsRes.pointsPerDollar ?? 10));
        setPointsToCentsInput(String(settingsRes.pointsToCents ?? 100));
        setUsers(usersRes.users ?? []);
        setLogs(logsRes.logs ?? []);
        setLogsTotal(logsRes.total ?? 0);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api(`/api/admin/rewards/logs?limit=20&page=${logsPage}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setLogsTotal(d.total ?? 0);
      })
      .catch(() => {});
  }, [logsPage]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const perDollar = parseInt(pointsPerDollarInput, 10);
    const toCents = parseInt(pointsToCentsInput, 10);
    if (
      Number.isNaN(perDollar) ||
      perDollar < 0 ||
      Number.isNaN(toCents) ||
      toCents <= 0
    ) {
      setMessage({
        type: "error",
        text: "Points per dollar must be ≥ 0; points for $1 must be > 0.",
      });
      setSaving(false);
      return;
    }
    try {
      const res = await api("/api/admin/rewards", {
        method: "PUT",
        body: JSON.stringify({
          pointsPerDollar: perDollar,
          pointsToCents: toCents,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      const data = await res.json();
      setSettings(data);
      setMessage({ type: "success", text: "Rewards settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!adjustEmail.trim()) {
      setMessage({ type: "error", text: "Email is required" });
      return;
    }
    const points = parseInt(adjustPoints, 10);
    if (Number.isNaN(points) || points === 0) {
      setMessage({
        type: "error",
        text: "Points must be a non-zero number (use negative to deduct)",
      });
      return;
    }
    setAdjusting(true);
    try {
      const res = await api("/api/admin/rewards/adjust", {
        method: "POST",
        body: JSON.stringify({
          email: adjustEmail.trim(),
          points,
          description: adjustDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to adjust");
      }
      setMessage({
        type: "success",
        text: `Points adjusted. New balance updated.`,
      });
      setAdjustEmail("");
      setAdjustPoints("");
      setAdjustDescription("");
      const usersRes = await api("/api/admin/rewards/users");
      const usersData = await usersRes.json();
      setUsers(usersData.users ?? []);
      const logsRes = await api("/api/admin/rewards/logs?limit=20&page=1");
      const logsData = await logsRes.json();
      setLogs(logsData.logs ?? []);
      setLogsTotal(logsData.total ?? 0);
      setLogsPage(1);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to adjust points",
      });
    } finally {
      setAdjusting(false);
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
          <h1 className="text-2xl font-bold">Rewards</h1>
          <p className="text-base-content/80">
            Configure the rewards program, view users with points, and log point
            transactions.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}
        >
          <span>{message.text}</span>
        </div>
      )}

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Settings</h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="form-control">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="label py-0" htmlFor="points-per-dollar">
                  <span className="label-text font-medium">
                    Points per dollar spent
                  </span>
                </label>
                <input
                  id="points-per-dollar"
                  type="number"
                  min="0"
                  step="1"
                  className="input input-bordered w-24"
                  value={pointsPerDollarInput}
                  onChange={(e) => setPointsPerDollarInput(e.target.value)}
                  placeholder="10"
                />
                <span className="text-sm text-base-content/60">
                  Customers earn this many points for each dollar spent.
                </span>
              </div>
            </div>
            <div className="form-control">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="label py-0" htmlFor="points-to-cents">
                  <span className="label-text font-medium">
                    Points needed for $1 discount
                  </span>
                </label>
                <input
                  id="points-to-cents"
                  type="number"
                  min="1"
                  step="1"
                  className="input input-bordered w-24"
                  value={pointsToCentsInput}
                  onChange={(e) => setPointsToCentsInput(e.target.value)}
                  placeholder="100"
                />
                <span className="text-sm text-base-content/60">
                  e.g. 100 = 100 points redeem for $1 off.
                </span>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Manual adjustment</h2>
          <form onSubmit={handleAdjust} className="space-y-4 max-w-md">
            <div className="form-control">
              <label className="label" htmlFor="adjust-email">
                <span className="label-text">User email</span>
              </label>
              <input
                id="adjust-email"
                type="email"
                className="input input-bordered w-full"
                value={adjustEmail}
                onChange={(e) => setAdjustEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="form-control">
              <label className="label" htmlFor="adjust-points">
                <span className="label-text">
                  Points (positive to add, negative to deduct)
                </span>
              </label>
              <input
                id="adjust-points"
                type="number"
                className="input input-bordered w-full"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="100 or -50"
              />
            </div>
            <div className="form-control">
              <label className="label" htmlFor="adjust-desc">
                <span className="label-text">Description (optional)</span>
              </label>
              <input
                id="adjust-desc"
                type="text"
                className="input input-bordered w-full"
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                placeholder="Manual adjustment"
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={adjusting}
            >
              {adjusting ? "Applying…" : "Apply adjustment"}
            </button>
          </form>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div role="tablist" className="tabs tabs-boxed mb-4">
            <button
              type="button"
              role="tab"
              className={`tab ${listTab === "users" ? "tab-active" : ""}`}
              onClick={() => setListTab("users")}
            >
              Users
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${listTab === "logs" ? "tab-active" : ""}`}
              onClick={() => setListTab("logs")}
            >
              Reward Logs
            </button>
          </div>
          <div className="overflow-x-auto mt-4">
            {listTab === "users" ? (
              users.length === 0 ? (
                <p className="text-sm text-base-content/60 py-4">
                  No users with points balance.
                </p>
              ) : (
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th className="text-right">Points</th>
                      <th>Last visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td className="font-mono text-sm">{u.email ?? "—"}</td>
                        <td>
                          {[u.firstName, u.lastName]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </td>
                        <td className="text-right font-medium">
                          {u.pointsBalance.toLocaleString()}
                        </td>
                        <td className="text-sm text-base-content/60">
                          {u.lastVisit
                            ? new Date(u.lastVisit).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : logs.length === 0 ? (
              <p className="text-sm text-base-content/60 py-4">
                No reward transactions yet.
              </p>
            ) : (
              <>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Type</th>
                      <th className="text-right">Points</th>
                      <th>Order</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td className="text-sm whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="font-mono text-sm">
                          {typeof log.user === "object"
                            ? (log.user?.email ?? "—")
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`badge badge-sm ${
                              log.type === "earned"
                                ? "badge-success"
                                : log.type === "spent"
                                  ? "badge-warning"
                                  : "badge-ghost"
                            }`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td
                          className={`text-right font-medium ${log.points < 0 ? "text-error" : "text-success"}`}
                        >
                          {log.points > 0 ? "+" : ""}
                          {log.points}
                        </td>
                        <td className="font-mono text-xs">
                          {log.order
                            ? `#${String(log.order._id).slice(-6).toUpperCase()}`
                            : "—"}
                        </td>
                        <td
                          className="text-sm max-w-[200px] truncate"
                          title={log.description}
                        >
                          {log.description ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logsTotal > 20 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={logsPage <= 1}
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="flex items-center px-2 text-sm">
                      Page {logsPage} of {Math.ceil(logsTotal / 20)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={logsPage >= Math.ceil(logsTotal / 20)}
                      onClick={() => setLogsPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
