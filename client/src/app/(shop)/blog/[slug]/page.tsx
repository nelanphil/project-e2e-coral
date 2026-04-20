import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/lib/blog-data";
import { Calendar, Clock, User, ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} | CF Coral Blog`,
    description: post.excerpt,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const postIndex = blogPosts.findIndex((p) => p.slug === slug);
  const prevPost = postIndex < blogPosts.length - 1 ? blogPosts[postIndex + 1] : null;
  const nextPost = postIndex > 0 ? blogPosts[postIndex - 1] : null;

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-base-content/60 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="size-4" />
        Back to Blog
      </Link>

      {/* Hero placeholder image */}
      <div className={`${post.accentColor} rounded-2xl h-56 mb-8 flex items-end px-6 pb-5`}>
        <span className="badge badge-neutral">{post.category}</span>
      </div>

      {/* Post header */}
      <h1 className="text-3xl font-bold leading-tight mb-4">{post.title}</h1>
      <div className="flex flex-wrap items-center gap-5 text-sm text-base-content/55 mb-8 pb-8 border-b border-base-300">
        <span className="flex items-center gap-1.5">
          <User className="size-4" />
          {post.author}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="size-4" />
          {formatDate(post.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" />
          {post.readTime}
        </span>
      </div>

      {/* Post content */}
      <article
        className="prose prose-sm md:prose max-w-none text-base-content/85"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Prev / Next navigation */}
      <div className="grid sm:grid-cols-2 gap-4 mt-14 pt-8 border-t border-base-300">
        {prevPost ? (
          <Link
            href={`/blog/${prevPost.slug}`}
            className="card bg-base-100 shadow hover:shadow-md transition-shadow p-4 group"
          >
            <p className="text-xs text-base-content/50 mb-1 flex items-center gap-1">
              <ArrowLeft className="size-3" /> Older post
            </p>
            <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {prevPost.title}
            </p>
          </Link>
        ) : (
          <div />
        )}

        {nextPost ? (
          <Link
            href={`/blog/${nextPost.slug}`}
            className="card bg-base-100 shadow hover:shadow-md transition-shadow p-4 group sm:text-right"
          >
            <p className="text-xs text-base-content/50 mb-1 flex items-center gap-1 sm:justify-end">
              Newer post <ArrowLeft className="size-3 rotate-180" />
            </p>
            <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {nextPost.title}
            </p>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </main>
  );
}
