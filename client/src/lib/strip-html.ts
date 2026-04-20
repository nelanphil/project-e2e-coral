/**
 * Strip HTML tags to plain text. Used for meta descriptions, JSON-LD, and list previews.
 */
export function stripHtml(html: string | null | undefined): string {
  if (html == null || html === "") return "";
  return html
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
