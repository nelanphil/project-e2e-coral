import { PAGE_DEFINITIONS } from "@/lib/page-sections";
import { ContactForm } from "@/components/ContactForm";

export const dynamic = "force-dynamic";

type SectionFromApi = { key: string; label?: string; content: string };

async function getPageSections(slug: string): Promise<SectionFromApi[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004";
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

export default async function CustomerServicePage() {
  const slug = "customer-service";
  const def = PAGE_DEFINITIONS[slug];
  const sections = await getPageSections(slug);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">{def.title}</h1>
      {sections.length === 0 ? null : (
        <>
          {sections.map((section) => (
            <section key={section.key} className="mb-10">
              <h2 className="text-xl font-semibold mb-3 border-b border-base-300 pb-2">
                {section.label ?? section.key}
              </h2>
              <div
                className="prose prose-base max-w-none"
                dangerouslySetInnerHTML={{ __html: section.content ?? "" }}
              />
              {section.key === "faq" && (
                <div className="mt-10">
                  <h2 className="text-xl font-semibold mb-3 border-b border-base-300 pb-2">
                    Send Us a Message
                  </h2>
                  <ContactForm />
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
