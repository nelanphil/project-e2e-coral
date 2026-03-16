"use client";

import Link from "next/link";
import { PAGE_DEFINITIONS } from "@/lib/page-sections";

const PAGES = [
  { slug: "customer-service", icon: "💬" },
  { slug: "shipping-returns", icon: "📦" },
  { slug: "privacy-policy", icon: "🔒" },
  { slug: "terms-of-service", icon: "📄" },
];

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Editor</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Edit the content of your store&apos;s information pages.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PAGES.map(({ slug, icon }) => {
          const def = PAGE_DEFINITIONS[slug];
          return (
            <Link
              key={slug}
              href={`/admin/content/${slug}`}
              className="card bg-base-100 shadow hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <h2 className="card-title text-base">{def.title}</h2>
                    <p className="text-sm text-base-content/60">
                      {def.sections.length} section{def.sections.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="divider" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/content/contact-submissions"
          className="card bg-base-100 shadow hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-body">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📬</span>
              <div>
                <h2 className="card-title text-base">Contact Submissions</h2>
                <p className="text-sm text-base-content/60">View inbound messages</p>
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/content/scrolling-banner"
          className="card bg-base-100 shadow hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-body">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📢</span>
              <div>
                <h2 className="card-title text-base">Scrolling Banner</h2>
                <p className="text-sm text-base-content/60">Manage ticker messages</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
