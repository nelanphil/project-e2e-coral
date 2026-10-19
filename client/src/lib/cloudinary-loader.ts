"use client";

import type { ImageLoaderProps } from "next/image";

const TRANSFORM_PART =
  /^(?:a|ar|b|bo|c|co|cs|d|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_.+$/;

function isTransformSegment(segment: string): boolean {
  if (!segment || segment.includes(".")) return false;
  return segment.split(",").every((part) => TRANSFORM_PART.test(part));
}

/**
 * Rewrite a Cloudinary delivery URL so Cloudinary resizes it.
 * Next's default optimizer is disabled; this must not send the browser to /_next/image.
 * Non-Cloudinary sources (local logo, blob previews) are returned unchanged.
 */
export function cloudinaryImageUrl(src: string, width: number): string {
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }

  const marker = "/upload/";
  const idx = src.indexOf(marker);
  const prefix = src.slice(0, idx);
  const rest = src.slice(idx + marker.length);
  const transform = `f_auto,c_limit,w_${width},q_auto`;

  const versionAt = rest.search(/(?:^|\/)v\d+\//);
  if (versionAt !== -1) {
    const versionIdx = versionAt === 0 ? 0 : versionAt + 1;
    const before = rest.slice(0, versionIdx);
    const kept = before
      .split("/")
      .filter(Boolean)
      .filter((segment) => !isTransformSegment(segment));
    const middle = kept.length > 0 ? `${kept.join("/")}/` : "";
    return `${prefix}${marker}${transform}/${middle}${rest.slice(versionIdx)}`;
  }

  const parts = rest.split("/");
  let i = 0;
  while (i < parts.length - 1 && isTransformSegment(parts[i])) i += 1;
  return `${prefix}${marker}${transform}/${parts.slice(i).join("/")}`;
}

export default function cloudinaryLoader({
  src,
  width,
}: ImageLoaderProps): string {
  return cloudinaryImageUrl(src, width);
}
