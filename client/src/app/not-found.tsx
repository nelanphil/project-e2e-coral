import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you were looking for could not be found.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-20 flex flex-col items-center text-center gap-6 min-h-[60vh] justify-center">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <h2 className="text-2xl font-semibold">Page Not Found</h2>
      <p className="text-base-content/70 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
        Try browsing our store or return home.
      </p>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        <Link href="/" className="btn btn-primary">
          Home
        </Link>
        <Link href="/store" className="btn btn-outline">
          Browse Store
        </Link>
        <Link href="/collections" className="btn btn-outline">
          Collections
        </Link>
      </div>
    </main>
  );
}
