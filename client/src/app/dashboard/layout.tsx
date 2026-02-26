"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Minus } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  // Sidebar auto-closes when navigation links are clicked (handled in onClick handlers)

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", label: "Account Details" },
    { href: "/dashboard/theme", label: "Theme" },
    { href: "/dashboard/shipping", label: "Shipping Address" },
    { href: "/dashboard/orders", label: "Order History" },
    { href: "/dashboard/notifications", label: "Notifications" },
  ];

  return (
    <div className="min-h-screen bg-base-200 pt-5">
      <div className="container mx-auto px-2 sm:px-4 pt-1 pb-6">
        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          className="btn btn-ghost btn-sm mb-4 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <Minus className="w-5 h-5" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          <span className="ml-2">Menu</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar Card */}
          <aside
            className={`w-full lg:w-64 shrink-0 transition-all duration-300 ${
              sidebarOpen ? "block" : "hidden lg:block"
            }`}
          >
            <div className="card bg-base-100 shadow-xl lg:sticky lg:top-24">
              <div className="card-body p-4 sm:p-6">
                <ul className="menu menu-vertical">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={pathname === item.href ? "active" : ""}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
