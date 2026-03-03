import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { CollectionsCarousel } from "@/components/home/CollectionsCarousel";
import { fetchApi } from "@/lib/api-server";
import { stripHtml } from "@/lib/strip-html";
import type {
  CategoriesResponse,
  CollectionsResponse,
  ProductsResponse,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Coral Store — Premium Corals for Your Reef",
  description:
    "Shop premium corals for your reef aquarium. Carefully curated selection of high-quality specimens for beginners and experienced collectors.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Coral Store — Premium Corals for Your Reef",
    description:
      "Shop premium corals for your reef aquarium. Carefully curated selection of high-quality specimens for beginners and experienced collectors.",
  },
  twitter: {
    card: "summary",
    title: "Coral Store — Premium Corals for Your Reef",
    description:
      "Shop premium corals for your reef aquarium. Carefully curated selection of high-quality specimens for beginners and experienced collectors.",
  },
};

export default async function Home() {
  let categories: CategoriesResponse["categories"] = [];
  let featuredProducts: ProductsResponse["products"] = [];
  let collections: CollectionsResponse["collections"] = [];

  try {
    const [categoriesData, productsData, collectionsData] = await Promise.all([
      fetchApi<CategoriesResponse>("/api/categories"),
      fetchApi<ProductsResponse>("/api/products?limit=3"),
      fetchApi<CollectionsResponse>("/api/collections"),
    ]);
    categories = categoriesData.categories ?? [];
    featuredProducts = productsData.products ?? [];
    collections = collectionsData.collections ?? [];
  } catch {
    // API may be down, continue with empty arrays
  }

  return (
    <div>
      {/* Collections Carousel */}
      <CollectionsCarousel
        collections={collections.filter((c) => c.showInCarousel === true)}
      />

      {/* About Section */}
      <section className="py-16 px-4 bg-base-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-8">
            About Coral Store
          </h2>
          <div className="prose prose-lg max-w-none text-base-content/80">
            <p className="text-lg mb-4">
              At Coral Store, we are passionate about bringing you the highest
              quality coral products from around the world. Our carefully
              curated selection features stunning specimens that are perfect for
              both beginners and experienced collectors.
            </p>
            <p className="text-lg mb-4">
              We work directly with trusted suppliers to ensure every coral
              meets our strict quality standards. Whether you&apos;re looking to
              start your collection or add rare pieces to an existing one, we
              have something special for everyone.
            </p>
            <p className="text-lg">
              Our commitment to excellence extends beyond our products. We
              provide expert guidance, secure shipping, and exceptional customer
              service to make your coral shopping experience as smooth and
              enjoyable as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Features/Benefits Section */}
      <section className="py-16 px-4 bg-base-200">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Coral Store?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-xl mb-2">Premium Quality</h3>
                <p className="text-base-content/70">
                  Every coral in our collection is carefully selected and
                  inspected to ensure the highest quality standards.
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-xl mb-2">Wide Selection</h3>
                <p className="text-base-content/70">
                  Browse through our extensive catalog featuring diverse coral
                  varieties from different regions and price ranges.
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-xl mb-2">Expert Support</h3>
                <p className="text-base-content/70">
                  Our knowledgeable team is here to help you find the perfect
                  coral and answer any questions you may have.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="py-16 px-4 bg-base-100">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-8">
              Featured Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <Link
                  key={product._id}
                  href={`/coral/${product.slug}?from=store`}
                  className="card bg-base-200 shadow-md hover:shadow-lg transition">
                  <figure className="bg-base-300 h-48" />
                  <div className="card-body">
                    <h3 className="card-title text-lg">{product.name}</h3>
                    <p className="text-sm text-base-content/70 line-clamp-2">
                      {stripHtml(product.description)}
                    </p>
                    <p className="font-semibold text-lg flex items-center gap-2">
                      <span>${(product.price / 100).toFixed(2)}</span>
                      {product.compareAtPrice != null &&
                        product.compareAtPrice > product.price && (
                          <span className="text-sm text-base-content/50 line-through font-normal">
                            ${(product.compareAtPrice / 100).toFixed(2)}
                          </span>
                        )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/category" className="btn btn-primary">
                View All Products
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-lg text-base-content/80 mb-8">
            Sign up for our newsletter to receive updates on latest arrivals,
            special offers, and exclusive news about new coral collections.
          </p>
          <div className="max-w-md mx-auto">
            <NewsletterSignup />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.filter(
        (c) => !["Uncategorized", "Dry Goods", "WYSIWYG"].includes(c.name),
      ).length > 0 && (
        <section className="py-16 px-4 bg-base-200">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-8">
              Browse by Category
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {categories
                .filter(
                  (c) =>
                    !["Uncategorized", "Dry Goods", "WYSIWYG"].includes(c.name),
                )
                .map((category) => (
                  <Link
                    key={category._id}
                    href={`/category/${category.slug}`}
                    className="btn btn-outline btn-lg">
                    {category.name}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
