import Link from "next/link";
import { blogPosts } from "@/lib/blog-data";
import { Calendar, Clock, User } from "lucide-react";

export const metadata = {
  title: "Blog | Coral Store",
  description:
    "Care guides, species spotlights, and expert tips for reef aquarium enthusiasts.",
};

const FEATURED_COUNT = 2;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const featuredPosts = blogPosts.slice(0, FEATURED_COUNT);
  const remainingPosts = blogPosts.slice(FEATURED_COUNT);

  return (
    <main className="container mx-auto px-4 py-10 max-w-6xl">
      {/* Page Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">The Reef Journal</h1>
        <p className="text-base-content/60 text-lg max-w-xl mx-auto">
          Care guides, species spotlights, and expert tips for reef aquarium
          enthusiasts.
        </p>
      </div>

      {/* Featured Posts */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold">Latest Posts</h2>
          <div className="badge badge-primary">New</div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {featuredPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow group overflow-hidden"
            >
              {/* Placeholder image area */}
              <figure
                className={`${post.accentColor} h-52 flex items-end px-6 pb-4 relative`}
              >
                <span className="badge badge-neutral badge-sm">
                  {post.category}
                </span>
              </figure>
              <div className="card-body pt-5">
                <h3 className="card-title text-xl leading-snug group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-base-content/65 text-sm line-clamp-3 mt-1">
                  {post.excerpt}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-base-content/50">
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(post.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {post.readTime}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="divider mb-10">All Articles</div>

      {/* Paginated Posts Grid */}
      {paginatedPosts.length > 0 && (
        <section>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {paginatedPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="card bg-base-100 shadow hover:shadow-lg transition-shadow group overflow-hidden"
              >
                {/* Placeholder image area */}
                <figure
                  className={`${post.accentColor} h-36 flex items-end px-4 pb-3`}
                >
                  <span className="badge badge-neutral badge-xs">
                    {post.category}
                  </span>
                </figure>
                <div className="card-body pt-4 pb-5">
                  <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-base-content/60 text-xs line-clamp-2 mt-1">
                    {post.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-base-content/45">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(post.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              {safePage > 1 ? (
                <Link
                  href={`/blog?page=${safePage - 1}`}
                  className="btn btn-outline btn-sm gap-1"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                  Prev
                </Link>
              ) : (
                <button
                  className="btn btn-outline btn-sm gap-1"
                  disabled
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                  Prev
                </button>
              )}

              <div className="join">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Link
                      key={page}
                      href={`/blog?page=${page}`}
                      className={`join-item btn btn-sm ${page === safePage ? "btn-primary" : "btn-outline"}`}
                      aria-label={`Page ${page}`}
                      aria-current={page === safePage ? "page" : undefined}
                    >
                      {page}
                    </Link>
                  ),
                )}
              </div>

              {safePage < totalPages ? (
                <Link
                  href={`/blog?page=${safePage + 1}`}
                  className="btn btn-outline btn-sm gap-1"
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <button
                  className="btn btn-outline btn-sm gap-1"
                  disabled
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="size-4" />
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
