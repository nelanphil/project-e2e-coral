/**
 * Strip HTML tags to plain text. Used for meta descriptions, JSON-LD, and list previews.
 */
export function stripHtml(html: string | null | undefined): string {
  if (html == null || html === "") return "";
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? div.innerText ?? "").trim().replace(/\s+/g, " ");
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
