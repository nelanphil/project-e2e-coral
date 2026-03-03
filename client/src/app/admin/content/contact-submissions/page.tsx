"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

interface Submission {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read";
  createdAt: string;
}

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api("/api/contact")
      .then((r) => (r.ok ? r.json() : { submissions: [], total: 0 }))
      .then((data: { submissions: Submission[]; total: number }) => {
        setSubmissions(data.submissions ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id: string) {
    const res = await api(`/api/contact/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "read" }),
    });
    if (res.ok) {
      setSubmissions((prev) =>
        prev.map((s) => (s._id === id ? { ...s, status: "read" } : s))
      );
    }
  }

  const newCount = submissions.filter((s) => s.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/content" className="text-sm text-base-content/60 hover:text-base-content mb-1 inline-block">
            ← Content
          </Link>
          <h1 className="text-2xl font-bold">
            Contact Submissions
            {newCount > 0 && (
              <span className="badge badge-primary badge-sm ml-2 align-middle">{newCount} new</span>
            )}
          </h1>
          <p className="text-sm text-base-content/60 mt-1">{total} total submissions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body text-center text-base-content/60 py-16">
            No contact submissions yet.
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <>
                    <tr
                      key={sub._id}
                      className={sub.status === "new" ? "font-medium" : "text-base-content/70"}
                    >
                      <td>
                        {sub.status === "new" ? (
                          <span className="badge badge-primary badge-sm">New</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">Read</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        {new Date(sub.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>{sub.name}</td>
                      <td className="text-sm">{sub.email}</td>
                      <td className="max-w-xs truncate">{sub.subject}</td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs mr-1"
                          onClick={() =>
                            setExpanded(expanded === sub._id ? null : sub._id)
                          }
                        >
                          {expanded === sub._id ? "Hide" : "View"}
                        </button>
                        {sub.status === "new" && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => markRead(sub._id)}
                          >
                            Mark read
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === sub._id && (
                      <tr key={`${sub._id}-expanded`}>
                        <td colSpan={6} className="bg-base-200">
                          <div className="p-3 space-y-2">
                            <div>
                              <span className="text-xs text-base-content/50 uppercase tracking-wide">From</span>
                              <p className="text-sm">{sub.name} &lt;{sub.email}&gt;</p>
                            </div>
                            <div>
                              <span className="text-xs text-base-content/50 uppercase tracking-wide">Subject</span>
                              <p className="text-sm font-medium">{sub.subject}</p>
                            </div>
                            <div>
                              <span className="text-xs text-base-content/50 uppercase tracking-wide">Message</span>
                              <p className="text-sm whitespace-pre-wrap">{sub.message}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
