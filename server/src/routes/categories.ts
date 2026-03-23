import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { Category } from "../models/Category.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  try {
    const categories = await Category.find({ deletedAt: null })
      .sort({ name: 1 })
      .lean();
    res.json({ categories });
  } catch {
    res.status(500).json({ error: "Failed to list categories" });
  }
});

categoriesRouter.get("/id/:id", requireAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(category);
  } catch {
    res.status(500).json({ error: "Failed to get category" });
  }
});

categoriesRouter.get("/:slug", async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      deletedAt: null,
    }).lean();
    if (!category) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(category);
  } catch {
    res.status(500).json({ error: "Failed to get category" });
  }
});

categoriesRouter.post("/", requireAdmin, async (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    res.status(400).json({ error: "name and slug required" });
    return;
  }
  const category = await Category.create({ name, slug });
  res.status(201).json(category);
});

categoriesRouter.put("/:id", requireAdmin, async (req, res) => {
  const { name, slug } = req.body;
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { ...(name != null && { name }), ...(slug != null && { slug }) },
    { new: true },
  ).lean();
  if (!category) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(category);
});

categoriesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { deletedAt: new Date() },
    { new: true },
  );
  if (!category) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ok: true });
});

categoriesRouter.patch("/:id/restore", requireAdmin, async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { deletedAt: null },
    { new: true },
  ).lean();
  if (!category) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(category);
});
