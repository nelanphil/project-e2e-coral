import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { CartDrawerProvider } from "@/lib/cart/cart-drawer-context";
import { Nav } from "@/components/Nav";
import { TickerBanner } from "@/components/TickerBanner";
import { Footer } from "@/components/Footer";
import { CartStoreHydrator } from "@/components/cart/CartStoreHydrator";
import { CartHeartbeat } from "@/components/cart/CartHeartbeat";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import "./globals.css";

const themeScript = `
(function() {
  var stored = localStorage.getItem("theme");
  var theme = stored === "light" || stored === "dark" ? stored : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Coral Store",
  description: "eCommerce store for coral",
  openGraph: {
    type: "website",
    siteName: "Coral Store",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Coral Store",
  url: siteUrl,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider>
          <AuthProvider>
            <CartDrawerProvider>
              <CartStoreHydrator />
              <CartHeartbeat />
              <div className="flex flex-col min-h-screen">
                <div className="fixed top-0 left-0 right-0 z-50">
                  <TickerBanner />
                  <Nav />
                </div>
                <div className="pt-[var(--header-height)] flex-1">
                  {children}
                </div>
                <Footer />
                <ScrollToTop />
              </div>
            </CartDrawerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
