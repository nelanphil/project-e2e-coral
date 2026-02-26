import { fetchApi } from "@/lib/api-server";
import type { CollectionsResponse } from "@/lib/types";
import { CollectionsList } from "./CollectionsList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Collections",
  description: "Browse our collections",
};

export default async function CollectionsPage() {
  let collections: CollectionsResponse["collections"] = [];
  try {
    const data = await fetchApi<CollectionsResponse>("/api/collections", {
      cache: "no-store",
    } as RequestInit);
    const raw = data.collections ?? [];
    collections = [...raw].sort((a, b) =>
      (a.name ?? "").trim().toLowerCase().localeCompare((b.name ?? "").trim().toLowerCase(), undefined, { sensitivity: "base" })
    );
  } catch {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Failed to load collections.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <CollectionsList collections={collections} />
    </main>
  );
}
