"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PAGE_DEFINITIONS } from "@/lib/page-sections";
import { getAuthToken } from "@/lib/auth";

export type PageSection = {
  key: string;
  label: string;
  content: string;
  hidden: boolean;
  /** Stable id for React keys so key/label edits don't remount (client-only, not sent to API). */
  _clientId?: string;
};

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

function slugifyKey(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminContentSlugPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] : "";
  const def = PAGE_DEFINITIONS[slug];

  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [hiddenOpen, setHiddenOpen] = useState(false);

  useEffect(() => {
    if (!def) return;
    setLoading(true);
    api(`/api/pages/${slug}`)
      .then((r) => (r.ok ? r.json() : { sections: [] }))
      .then((data: { sections: { key: string; label?: string; content?: string; hidden?: boolean }[] }) => {
        const raw = data.sections ?? [];
        if (raw.length === 0) {
          setSections(
            def.sections.map((s, i) => ({
              key: s.key,
              label: s.label,
              content: s.defaultContent,
              hidden: false,
              _clientId: `s-${i}`,
            }))
          );
          return;
        }
        const defByKey = Object.fromEntries(def.sections.map((s) => [s.key, s]));
        setSections(
          raw.map((s, i) => ({
            key: s.key,
            label: s.label ?? defByKey[s.key]?.label ?? s.key,
            content: s.content ?? defByKey[s.key]?.defaultContent ?? "",
            hidden: s.hidden === true,
            _clientId: `s-${i}`,
          }))
        );
      })
      .catch(() =>
        setSections(
          def.sections.map((s, i) => ({
            key: s.key,
            label: s.label,
            content: s.defaultContent,
            hidden: false,
            _clientId: `s-${i}`,
          }))
        )
      )
      .finally(() => setLoading(false));
  }, [slug, def]);

  if (!def) {
    return (
      <div className="space-y-4">
        <p className="text-error">Page not found: {slug}</p>
        <Link href="/admin/content" className="btn btn-ghost btn-sm">
          ← Back to Content
        </Link>
      </div>
    );
  }

  function updateSection(index: number, patch: Partial<PageSection>) {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function setHidden(index: number, hidden: boolean) {
    updateSection(index, { hidden });
  }

  function deriveKeyFromLabel(label: string, excludeKey?: string): string {
    const base = slugifyKey(label) || "section";
    const used = new Set(sections.map((s) => s.key).filter((k) => k !== excludeKey));
    if (!used.has(base)) return base;
    let n = 1;
    while (used.has(`${base}-${n}`)) n += 1;
    return `${base}-${n}`;
  }

  function addSection() {
    const keys = new Set(sections.map((s) => s.key));
    const base = "new-section";
    let candidate = base;
    let n = 1;
    while (keys.has(candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    setSections((prev) => [
      ...prev,
      { key: candidate, label: "New section", content: "", hidden: false, _clientId: `s-${Date.now()}` },
    ]);
  }

  function duplicateKeys(): string[] {
    const seen = new Map<string, number>();
    sections.forEach((s, i) => {
      const k = s.key.trim().toLowerCase();
      if (k) seen.set(k, (seen.get(k) ?? -1) === -1 ? i : 1);
    });
    return sections
      .map((s, i) => (s.key.trim() && seen.get(s.key.trim().toLowerCase()) !== i ? s.key : null))
      .filter(Boolean) as string[];
  }

  async function handleSave() {
    const dupes = duplicateKeys();
    if (dupes.length > 0) {
      setError(`Duplicate section keys: ${dupes.join(", ")}. Please make keys unique.`);
      return;
    }
    const invalid = sections.filter((s) => !s.hidden && (!s.key.trim() || !s.label.trim()));
    if (invalid.length > 0) {
      setError("Visible sections must have a key and label.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = sections.map((section) => ({
        key: section.key.trim() || section.key,
        label: section.label.trim() || section.label,
        content: section.content,
        hidden: section.hidden,
      }));
      const res = await api(`/api/pages/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ sections: payload }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to save. Please try again.");
        return;
      }
      const data = (await res.json()) as { sections: PageSection[] };
      setSections(
        data.sections.map((s, i) => ({
          key: s.key,
          label: s.label ?? "",
          content: s.content ?? "",
          hidden: s.hidden ?? false,
          _clientId: `s-${i}`,
        }))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const visible = sections.filter((s) => !s.hidden);
  const hidden = sections.filter((s) => s.hidden);
  const defKeys = new Set(def.sections.map((s) => s.key));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/content" className="text-sm text-base-content/60 hover:text-base-content mb-1 inline-block">
            ← Content
          </Link>
          <h1 className="text-2xl font-bold">{def.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-success text-sm font-medium">Saved!</span>}
          {error && <span className="text-error text-sm">{error}</span>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Saving…
              </>
            ) : (
              "Save All Changes"
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner" />
        </div>
      ) : (
        <div className="space-y-8">
          {visible.map((section) => {
            const globalIndex = sections.findIndex((s) => s === section);
            const isCustom = !defKeys.has(section.key);
            return (
              <div key={section._clientId ?? `s-${globalIndex}`} className="card bg-base-100 shadow">
                <div className="card-body">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {isCustom ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          placeholder="Section name"
                          className="input input-bordered input-sm flex-1 min-w-[160px]"
                          value={section.label}
                          onChange={(e) => {
                            const label = e.target.value;
                            const key = deriveKeyFromLabel(label, section.key);
                            updateSection(globalIndex, { label, key });
                          }}
                        />
                        <span className="text-sm text-base-content/60 whitespace-nowrap">
                          Key: <code className="bg-base-200 px-1 rounded">{section.key}</code>
                        </span>
                      </div>
                    ) : (
                      <h2 className="card-title text-base">{section.label}</h2>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-base-content/70"
                      onClick={() => setHidden(globalIndex, true)}
                      aria-label="Hide section"
                    >
                      Hide
                    </button>
                  </div>
                  <RichTextEditor
                    value={section.content}
                    onChange={(html) => updateSection(globalIndex, { content: html })}
                    aria-label={section.label}
                    minHeight="10rem"
                  />
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={addSection}>
              Add section
            </button>
          </div>

          {hidden.length > 0 && (
            <div className="border border-base-300 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full px-4 py-3 bg-base-200/50 text-left font-medium flex items-center justify-between"
                onClick={() => setHiddenOpen((o) => !o)}
                aria-expanded={hiddenOpen}
              >
                Hidden sections ({hidden.length})
                <span className="text-base-content/60">{hiddenOpen ? "▼" : "▶"}</span>
              </button>
              {hiddenOpen && (
                <div className="p-4 space-y-2 border-t border-base-300">
                  {hidden.map((section) => {
                    const globalIndex = sections.findIndex((s) => s === section);
                    return (
                      <div
                        key={section._clientId ?? `s-${globalIndex}`}
                        className="flex items-center justify-between gap-2 py-2 border-b border-base-200 last:border-0"
                      >
                        <span className="font-medium">{section.label || section.key || "Unnamed"}</span>
                        <span className="text-sm text-base-content/60">{section.key}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setHidden(globalIndex, false)}
                        >
                          Restore
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Saving…
            </>
          ) : (
            "Save All Changes"
          )}
        </button>
      </div>
    </div>
  );
}
