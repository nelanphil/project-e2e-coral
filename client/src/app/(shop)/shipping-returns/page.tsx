import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/api";
import { PAGE_DEFINITIONS } from "@/lib/page-sections";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "Learn about CF Coral shipping policies, live-arrival guarantees, and how to initiate a return or refund.",
  alternates: { canonical: "/shipping-returns" },
};

type SectionFromApi = { key: string; label?: string; content: string };

async function getPageSections(slug: string): Promise<SectionFromApi[]> {
  try {
    const apiUrl = getBaseUrl();
    const res = await fetch(`${apiUrl}/api/pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { sections: SectionFromApi[] };
    return data.sections ?? [];
  } catch {
    return [];
  }
}

export default async function ShippingReturnsPage() {
  const slug = "shipping-returns";
  const def = PAGE_DEFINITIONS[slug];
  const sections = await getPageSections(slug);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">{def.title}</h1>
      {sections.map((section) => (
        <section key={section.key} className="mb-10">
          <h2 className="text-xl font-semibold mb-3 border-b border-base-300 pb-2">
            {section.label ?? section.key}
          </h2>
          <div
            className="prose prose-base max-w-none"
            dangerouslySetInnerHTML={{ __html: section.content ?? "" }}
          />
        </section>
      ))}
    </div>
  );
}
