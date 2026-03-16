"use client";

import Link from "next/link";
import Image from "next/image";
import {
  LogOut,
  Menu,
  Moon,
  ShoppingCart,
  Sun,
  UserRoundCog,
  X,
} from "lucide-react";
import logo from "@/assets/logo/cf-corals-widish-logo.webp";
import { useAuth } from "@/lib/auth-context";
import { useCartDrawer } from "@/lib/cart/cart-drawer-context";
import { useCartStore } from "@/stores/cart-store";
import { useThemeStore } from "@/stores/theme-store";
import { useEffect, useRef, useState } from "react";

export function Nav() {
  const { user, loading, logout } = useAuth();
  const { openCart, isOpen: isCartOpen } = useCartDrawer();
  const cartCount = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollPositionRef = useRef(0);
  const wasLockedRef = useRef(false);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
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
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={`navbar min-h-30 py-4 flex items-center bg-base-100 transition-all duration-300 ${isCartOpen ? "blur-sm opacity-75" : ""}`}
      >
        <div className="w-full px-6 flex items-center gap-2">
          {/* Left: hamburger on mobile (when logged in) */}
          <div className="flex-1 flex justify-start items-center min-w-0">
            {user && (
              <button
                type="button"
                className="btn btn-ghost btn-sm lg:hidden"
                aria-label="Toggle menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </button>
            )}
          </div>
          {/* Center: Store | Collections | Coral Store | Blog | Account */}
          <div className="relative z-10 flex items-center gap-2 shrink-0 justify-center">
            <Link href="/store" className="btn btn-ghost btn-sm shrink-0 hidden lg:flex">
              Store
            </Link>
            <Link
              href="/collections"
              className="btn btn-ghost btn-sm shrink-0 hidden lg:flex"
            >
              Collections
            </Link>
            <Link
              href="/"
              className="btn btn-ghost p-1 hover:bg-transparent shrink-0"
              aria-label="Coral Store home"
            >
              <Image
                src={logo}
                alt="Coral Store"
                className="h-38 w-auto"
                priority
              />
            </Link>
            <Link href="/blog" className="btn btn-ghost btn-sm shrink-0 hidden lg:flex">
              Blog
            </Link>
            <Link
              href={
                loading || !user
                  ? "/auth/login?redirect=" + encodeURIComponent("/dashboard")
                  : "/dashboard"
              }
              className="btn btn-ghost btn-sm shrink-0 hidden lg:flex whitespace-nowrap"
              aria-label={user ? "User dashboard" : "Log in or sign up"}
            >
              Account
            </Link>
          </div>
          {/* Right: Admin (admin only) | Theme | Logout & Cart (or Login/Sign up & Cart) */}
          <div className="flex-1 flex justify-end items-center gap-2">
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="btn btn-ghost btn-sm hidden lg:flex"
                aria-label="Admin dashboard"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm hidden lg:flex"
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "dark" ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </button>
            {loading ? (
              <span className="text-sm text-base-content/70 lg:hidden">
                Loading…
              </span>
            ) : user ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm hidden lg:flex"
                  aria-label="Log out"
                  onClick={logout}
                >
                  <LogOut className="size-5" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm gap-1"
                  aria-label="Open cart"
                  onClick={openCart}
                >
                  <ShoppingCart className="size-5" />
                  {cartCount > 0 && (
                    <span className="badge badge-sm">{cartCount}</span>
                  )}
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link href="/auth/sign-up" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm gap-1"
                  aria-label="Open cart"
                  onClick={openCart}
                >
                  <ShoppingCart className="size-5" />
                  {cartCount > 0 && (
                    <span className="badge badge-sm">{cartCount}</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {user && (
        <div
          className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
            mobileMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu Panel */}
          <div
            className={`absolute right-0 top-0 h-full w-64 bg-base-100 shadow-xl transform transition-transform duration-300 ${
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-base-300">
                <h2 className="text-lg font-bold">Menu</h2>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4">
                <ul className="menu menu-vertical gap-2">
                  <li>
                    <Link
                      href="/store"
                      className="flex items-center gap-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>Store</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/collections"
                      className="flex items-center gap-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>Collections</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/blog"
                      className="flex items-center gap-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>Blog</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <UserRoundCog className="size-5" />
                      <span>Dashboard</span>
                    </Link>
                  </li>
                  {user?.role === "admin" && (
                    <li>
                      <Link
                        href="/admin"
                        className="flex items-center gap-3"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span>Admin</span>
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      className="flex items-center gap-3 w-full"
                      onClick={() => {
                        setTheme(theme === "light" ? "dark" : "light");
                      }}
                    >
                      {theme === "dark" ? (
                        <Sun className="size-5" />
                      ) : (
                        <Moon className="size-5" />
                      )}
                      <span>Theme: {theme === "dark" ? "Dark" : "Light"}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="flex items-center gap-3 text-error"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="size-5" />
                      <span>Log out</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
