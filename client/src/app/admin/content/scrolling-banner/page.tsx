"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

const TICKER_CHANNEL = "ticker-banner-update";

function notifyTickerUpdate() {
  if (typeof BroadcastChannel !== "undefined") {
    new BroadcastChannel(TICKER_CHANNEL).postMessage("update");
  }
}

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

interface TickerItem {
  _id: string;
  text: string;
  deletedAt: string | null;
  sortOrder: number;
  createdAt: string;
}

export default function ScrollingBannerPage() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  // reorder loading
  const [movingId, setMovingId] = useState<string | null>(null);

  // visibility toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const active = items.filter((i) => !i.deletedAt);
  const deleted = items.filter((i) => i.deletedAt);

  function loadItems() {
    return api("/api/admin/ticker-items")
      .then((r) => r.json())
      .then((data: { items: TickerItem[] }) => {
        setItems(data.items ?? []);
      })
      .catch(() => setError("Failed to load ticker items"));
  }

  useEffect(() => {
    loadItems().finally(() => setLoading(false));
  }, []);

  // focus edit input when it appears
  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  async function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api("/api/admin/ticker-items", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to add item");
        return;
      }
      setNewText("");
      addInputRef.current?.focus();
      await loadItems();
      notifyTickerUpdate();
    } catch {
      setError("Failed to add item");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(item: TickerItem) {
    setEditingId(item._id);
    setEditText(item.text);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function handleSave(id: string) {
    const text = editText.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api(`/api/admin/ticker-items/${id}`, {
        method: "PUT",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to save item");
        return;
      }
      setEditingId(null);
      await loadItems();
      notifyTickerUpdate();
    } catch {
      setError("Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    setMovingId(id);
    setError(null);
    try {
      const res = await api(`/api/admin/ticker-items/${id}/move`, {
        method: "PATCH",
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        setError("Failed to reorder item");
        return;
      }
      const data = (await res.json()) as { items: TickerItem[] };
      setItems(data.items ?? []);
      notifyTickerUpdate();
    } catch {
      setError("Failed to reorder item");
    } finally {
      setMovingId(null);
    }
  }

  async function handleHardDelete(id: string) {
    setError(null);
    try {
      const res = await api(`/api/admin/ticker-items/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Failed to permanently delete item");
        return;
      }
      await loadItems();
      notifyTickerUpdate();
    } catch {
      setError("Failed to permanently delete item");
    }
  }

  async function handleRestore(id: string) {
    setTogglingId(id);
    setError(null);
    try {
      const res = await api(`/api/admin/ticker-items/${id}/restore`, {
        method: "PATCH",
      });
      if (!res.ok) {
        setError("Failed to restore item");
        return;
      }
      await loadItems();
      notifyTickerUpdate();
    } catch {
      setError("Failed to restore item");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleVisibility(id: string) {
    setTogglingId(id);
    setError(null);
    try {
      const res = await api(`/api/admin/ticker-items/${id}/soft-delete`, {
        method: "PATCH",
      });
      if (!res.ok) {
        setError("Failed to hide item");
        return;
      }
      if (editingId === id) cancelEdit();
      await loadItems();
      notifyTickerUpdate();
    } catch {
      setError("Failed to hide item");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Scrolling Banner</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Manage the messages shown in the scrolling ticker at the top of the
          store. Items are joined with a&nbsp;
          <span className="font-mono">✦</span> separator and displayed in the
          order shown below.
        </p>
      </div>

      {/* Add new item */}
      <div className="card bg-base-100 shadow">
        <div className="card-body gap-3">
          <h2 className="card-title text-base">Add a New Message</h2>
          <div className="flex gap-2">
            <input
              ref={addInputRef}
              type="text"
              className="input input-bordered flex-1"
              placeholder="e.g. Free shipping on orders over $50"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={adding}
              maxLength={200}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={adding || !newText.trim()}
            >
              {adding ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Add"
              )}
            </button>
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
        </div>
      </div>

      {/* Active items */}
      <div className="card bg-base-100 shadow">
        <div className="card-body gap-3">
          <h2 className="card-title text-base">
            Active Messages
            {!loading && (
              <span className="badge badge-neutral badge-sm ml-1">
                {active.length}
              </span>
            )}
          </h2>
          <p className="text-base-content/50 text-xs -mt-1">
            Toggle off to hide from banner without deleting.
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner" />
            </div>
          ) : active.length === 0 ? (
            <p className="text-base-content/50 text-sm py-2">
              No active messages. Add one above.
            </p>
          ) : (
            <ul className="divide-y divide-base-200">
              {active.map((item, idx) => (
                <li key={item._id} className="flex items-center gap-2 py-3">
                  {/* Visibility toggle */}
                  <label
                    className="flex items-center gap-1.5 shrink-0 cursor-pointer"
                    title="Hide from banner"
                  >
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-success"
                      checked
                      disabled={togglingId === item._id}
                      onChange={() => handleToggleVisibility(item._id)}
                      aria-label="Hide from banner"
                    />
                  </label>
                  {/* Reorder buttons */}
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs px-1"
                      aria-label="Move up"
                      disabled={idx === 0 || movingId === item._id}
                      onClick={() => handleMove(item._id, "up")}
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs px-1"
                      aria-label="Move down"
                      disabled={
                        idx === active.length - 1 || movingId === item._id
                      }
                      onClick={() => handleMove(item._id, "down")}
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>

                  {/* Text / edit input */}
                  {editingId === item._id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      className="input input-bordered input-sm flex-1"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(item._id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      maxLength={200}
                      disabled={saving}
                    />
                  ) : (
                    <span className="flex-1 text-sm">{item.text}</span>
                  )}

                  {/* Action buttons */}
                  <div className="flex shrink-0 gap-1">
                    {editingId === item._id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          aria-label="Save"
                          onClick={() => handleSave(item._id)}
                          disabled={saving || !editText.trim()}
                        >
                          {saving ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          aria-label="Cancel edit"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          <X className="size-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label="Edit"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Soft-deleted items */}
      {!loading && deleted.length > 0 && (
        <>
          <div className="divider">Removed Items</div>
          <div className="card bg-base-100 shadow border border-error/20">
            <div className="card-body gap-3">
              <h2 className="card-title text-base text-error/80">
                Soft-Deleted
                <span className="badge badge-error badge-outline badge-sm ml-1">
                  {deleted.length}
                </span>
              </h2>
              <p className="text-base-content/50 text-xs">
                These messages are hidden from the banner. Toggle on to show
                again, or permanently delete to remove.
              </p>
              <ul className="divide-y divide-base-200">
                {deleted.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    {/* Visibility toggle - show in banner */}
                    <label
                      className="flex items-center gap-1.5 shrink-0 cursor-pointer"
                      title="Show on banner"
                    >
                      <input
                        type="checkbox"
                        className="toggle toggle-sm toggle-success"
                        checked={false}
                        disabled={togglingId === item._id}
                        onChange={() => handleRestore(item._id)}
                        aria-label="Show on banner"
                      />
                    </label>
                    <span className="flex-1 text-sm line-through text-base-content/40">
                      {item.text}
                    </span>
                    <button
                      type="button"
                      className="btn btn-error btn-sm shrink-0"
                      onClick={() => handleHardDelete(item._id)}
                    >
                      Delete Permanently
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}