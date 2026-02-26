import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { CartDrawerProvider } from "@/lib/cart/cart-drawer-context";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartStoreHydrator } from "@/components/cart/CartStoreHydrator";
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

export const metadata: Metadata = {
  title: "Coral Store",
  description: "eCommerce store for coral",
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
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider>
          <AuthProvider>
            <CartDrawerProvider>
              <CartStoreHydrator />
              <div className="flex flex-col min-h-screen">
                <Nav />
                <div className="pt-32 flex-1">
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
