import { Router } from "express";
import { optionalAuth, requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { StaticPage } from "../models/StaticPage.js";
import { User } from "../models/User.js";
import { getDefaultSections } from "../data/staticPageDefaults.js";

export const pagesRouter = Router();

const VALID_SLUGS = new Set([
  "customer-service",
  "shipping-returns",
  "privacy-policy",
  "terms-of-service",
]);

type SectionPayload = { key: string; label?: string; content: string; hidden?: boolean };

pagesRouter.get("/:slug", optionalAuth, async (req: AuthRequest, res) => {
  const { slug } = req.params;
  if (!VALID_SLUGS.has(slug)) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  try {
    let page = await StaticPage.findOne({ slug }).lean();
    let raw = page?.sections ?? [];

    // Seed from defaults if page missing or has no sections
    if (raw.length === 0) {
      const defaultSections = getDefaultSections(slug);
      if (defaultSections?.length) {
        const created = await StaticPage.findOneAndUpdate(
          { slug },
          { $set: { sections: defaultSections } },
          { upsert: true, new: true }
        ).lean();
        page = created;
        raw = created?.sections ?? [];
      }
    }

    let isAdmin = false;
    if (req.userId) {
      const user = await User.findById(req.userId).lean<{ role?: string } | null>();
      isAdmin = user?.role === "admin";
    }

    if (isAdmin) {
      return res.json({
        sections: raw.map((s) => ({
          key: s.key,
          label: s.label,
          content: s.content ?? "",
          hidden: s.hidden === true,
        })),
      });
    }

    const sections = raw
      .filter((s) => s.hidden !== true)
      .map((s) => ({ key: s.key, label: s.label, content: s.content ?? "" }));
    res.json({ sections });
  } catch {
    res.status(500).json({ error: "Failed to fetch page content" });
  }
});

pagesRouter.put("/:slug", requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!VALID_SLUGS.has(slug)) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  const { sections } = req.body as { sections?: SectionPayload[] };
  if (!Array.isArray(sections)) {
    res.status(400).json({ error: "sections must be an array" });
    return;
  }
  const normalized = sections.map((s) => ({
    key: String(s.key),
    label: s.label != null ? String(s.label) : undefined,
    content: typeof s.content === "string" ? s.content : "",
    hidden: Boolean(s.hidden),
  }));
  try {
    const page = await StaticPage.findOneAndUpdate(
      { slug },
      { $set: { sections: normalized } },
      { upsert: true, new: true }
    ).lean();
    res.json({
      sections: (page?.sections ?? []).map((s) => ({
        key: s.key,
        label: s.label,
        content: s.content ?? "",
        hidden: s.hidden === true,
      })),
    });
  } catch {
    res.status(500).json({ error: "Failed to save page content" });
  }
});
