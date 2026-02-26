import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "a",
  "h1", "h2", "h3", "h4", "ul", "ol", "li",
  "span", "blockquote", "code", "pre",
];
const ALLOWED_ATTR = ["href", "target", "rel", "style", "class"];

/**
 * Sanitize HTML for safe rendering (e.g. product description and detail fields).
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (html == null || html === "") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target", "rel"],
  });
}
