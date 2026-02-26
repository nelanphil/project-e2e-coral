import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-md text-center">
      <h1 className="text-2xl font-bold">Thank you for your order</h1>
      <p className="mt-2 text-base-content/80">Payment was successful. We will ship your coral soon.</p>
      <Link href="/" className="btn btn-primary mt-6">Continue shopping</Link>
    </main>
  );
}
