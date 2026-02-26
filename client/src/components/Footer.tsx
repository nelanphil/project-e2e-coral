import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-base-200 border-t border-base-300 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Store Info */}
          <div>
            <h3 className="text-lg font-bold mb-2">Coral Store</h3>
            <p className="text-sm text-base-content/70">
              Your trusted source for premium coral products. We offer the finest selection
              of quality corals for enthusiasts and collectors.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-2">Quick Links</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/" className="link link-hover text-base-content/70">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/" className="link link-hover text-base-content/70">
                  Browse Categories
                </Link>
              </li>
              <li>
                <Link href="/cart" className="link link-hover text-base-content/70">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="font-semibold mb-2">Information</h4>
            <ul className="space-y-1 text-sm text-base-content/70">
              <li>Customer Service</li>
              <li>Shipping & Returns</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-base-300 mt-8 pt-6 text-center text-sm text-base-content/60">
          <p>&copy; {currentYear} Coral Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
