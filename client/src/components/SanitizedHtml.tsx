"use client";

import React from "react";
import { sanitizeHtml } from "@/lib/sanitize";

type SanitizedHtmlProps = {
  html: string | null | undefined;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
};

export function SanitizedHtml({
  html,
  className,
  as: Tag = "div",
}: SanitizedHtmlProps) {
  const clean = sanitizeHtml(html);
  if (!clean) return null;
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
