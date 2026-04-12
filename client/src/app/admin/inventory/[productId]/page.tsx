"use client";
import { getBaseUrl } from "@/lib/api";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import type { InventoryLog, PriceLog } from "@/lib/types";

const api = (path: string) => {
  const base = getBaseUrl();
  const token = getAuthToken();
  return fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

function InventoryLogContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params.productId as string;
  const initialTab =
    searchParams.get("tab") === "price" ? "price" : "inventory";

  const [tab, setTab] = useState<"inventory" | "price">(initialTab);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [priceLogs, setPriceLogs] = useState<PriceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api(`/api/admin/inventory/${productId}/logs`).then((r) => r.json()),
      api(`/api/admin/products/${productId}/price-logs`).then((r) => r.json()),
    ])
      .then(([invData, priceData]) => {
        setInventoryLogs(invData.logs ?? []);
        setPriceLogs(priceData.logs ?? []);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/admin/inventory" className="btn btn-ghost btn-sm">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">History</h1>
      </div>

      <div className="tabs tabs-boxed mb-4 w-fit">
        <button
          type="button"
          className={`tab ${tab === "inventory" ? "tab-active" : ""}`}
          onClick={() => setTab("inventory")}
        >
          Inventory log
        </button>
        <button
          type="button"
          className={`tab ${tab === "price" ? "tab-active" : ""}`}
          onClick={() => setTab("price")}
        >
          Price log
        </button>
      </div>

      {tab === "inventory" && (
        <div className="overflow-x-auto">
          {inventoryLogs.length === 0 ? (
            <p className="text-sm text-base-content/60">
              No inventory changes recorded.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Change</th>
                  <th>Reason</th>
                  <th>Notes</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {inventoryLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.quantityBefore}</td>
                    <td>{log.quantityAfter}</td>
                    <td
                      className={
                        log.change > 0
                          ? "text-success"
                          : log.change < 0
                            ? "text-error"
                            : ""
                      }
                    >
                      {log.change > 0 ? `+${log.change}` : log.change}
                    </td>
                    <td>
                      <span className="badge badge-sm">{log.reason}</span>
                    </td>
                    <td className="max-w-xs truncate">{log.notes || "—"}</td>
                    <td>
                      {[log.performedBy?.firstName, log.performedBy?.lastName]
                        .filter(Boolean)
                        .join(" ") || "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "price" && (
        <div className="overflow-x-auto">
          {priceLogs.length === 0 ? (
            <p className="text-sm text-base-content/60">
              No price changes recorded.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Field</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Reason</th>
                  <th>Notes</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {priceLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-sm">{log.field}</span>
                    </td>
                    <td>${(log.valueBefore / 100).toFixed(2)}</td>
                    <td>${(log.valueAfter / 100).toFixed(2)}</td>
                    <td>
                      <span className="badge badge-sm">
                        {log.reason?.replaceAll("_", " ") ?? "—"}
                      </span>
                    </td>
                    <td className="max-w-xs truncate">{log.notes || "—"}</td>
                    <td>
                      {[log.changedBy?.firstName, log.changedBy?.lastName]
                        .filter(Boolean)
                        .join(" ") || "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function InventoryLogPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <InventoryLogContent />
    </Suspense>
  );
}
