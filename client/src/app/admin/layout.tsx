"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollPositionRef = useRef(0);
  const wasLockedRef = useRef(false);

  // Prevent background scroll when admin sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      scrollPositionRef.current = window.scrollY;
      wasLockedRef.current = true;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
    } else {
      const scrollY = scrollPositionRef.current;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      if (wasLockedRef.current) {
        wasLockedRef.current = false;
        window.scrollTo(0, scrollY);
      }
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-base-200 px-4 py-4 sm:p-6 flex flex-col lg:flex-row gap-4">
      {/* Mobile: backdrop when sidebar open */}
      <div
        className={`fixed top-[var(--header-height)] left-0 right-0 bottom-0 z-30 bg-black/50 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!sidebarOpen}
        onClick={closeSidebar}
      />

      {/* Sidebar: drawer on mobile, static on desktop */}
      <aside
        className={`
          card bg-base-100 shadow w-56 shrink-0 self-start
          fixed top-[var(--header-height)] left-0 z-40 h-[calc(100vh-var(--header-height))] transform transition-transform duration-200 ease-out
          lg:static lg:top-auto lg:h-auto lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Admin navigation"
      >
        <div className="card-body p-4 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              className="font-bold text-lg"
              onClick={closeSidebar}
            >
              Admin
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square lg:hidden"
              aria-label="Close menu"
              onClick={closeSidebar}
            >
              <X className="size-5" />
            </button>
          </div>
          <ul className="menu mt-4 flex-1">
            <li>
              <Link href="/admin" onClick={closeSidebar}>
                Analytics
              </Link>
            </li>
            <li>
              <details>
                <summary>
                  <Link href="/admin/products" onClick={closeSidebar}>
                    Products
                  </Link>
                </summary>
                <ul>
                  <li>
                    <Link href="/admin/categories" onClick={closeSidebar}>
                      Categories
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/collections" onClick={closeSidebar}>
                      Collections
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/inventory" onClick={closeSidebar}>
                      Inventory
                    </Link>
                  </li>
                </ul>
              </details>
            </li>
            <li>
              <Link href="/admin/orders" onClick={closeSidebar}>
                Orders
              </Link>
            </li>
            <li>
              <Link href="/admin/users" onClick={closeSidebar}>
                Users
              </Link>
            </li>
            <li>
              <Link href="/admin/shipping" onClick={closeSidebar}>
                Shipping
              </Link>
            </li>
            <li>
              <Link href="/admin/rewards" onClick={closeSidebar}>
                Rewards
              </Link>
            </li>
            <li>
              <Link href="/admin/discounts" onClick={closeSidebar}>
                Discounts
              </Link>
            </li>
            <li>
              <details>
                <summary>Content</summary>
                <ul>
                  <li>
                    <Link href="/admin/content" onClick={closeSidebar}>
                      Page Editor
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/content/contact-submissions"
                      onClick={closeSidebar}
                    >
                      Contact Submissions
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/content/scrolling-banner"
                      onClick={closeSidebar}
                    >
                      Scrolling Banner
                    </Link>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main: full width on mobile, with menu button */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Open admin menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold text-lg">Admin</span>
        </div>
        {children}
      </main>
    </div>
  );
}
