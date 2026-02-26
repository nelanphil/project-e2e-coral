import type { Response, NextFunction } from "express";
import { Router } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import type { AuthRequest } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/auth.js";
import { Collection } from "../models/Collection.js";
import { Product } from "../models/Product.js";
import { Inventory } from "../models/Inventory.js";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

async function optionalAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId)
      .select("role")
      .lean<{ role?: string }>();
    (req as AuthRequest & { isAdmin?: boolean }).isAdmin =
      user?.role === "admin";
  } catch {
    // ignore invalid / expired token
  }
  next();
}

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export const collectionsRouter = Router();

const PRODUCT_SELECT = "name slug price images compareAtPrice";

/** Given an array of products, remove those with zero inventory. */
async function filterInStock<T extends { _id: unknown }>(
  products: T[],
): Promise<T[]> {
  if (products.length === 0) return products;
  const ids = products.map((p) => p._id);
  const inventories = await Inventory.find({ product: { $in: ids } })
    .select("product quantity")
    .lean();
  const qtyMap = new Map(
    inventories.map((inv) => [String(inv.product), inv.quantity]),
  );
  return products.filter((p) => (qtyMap.get(String(p._id)) ?? 0) > 0);
}

/**
 * Get product IDs for a collection.
 * Always merges both sources so the result is correct even when the two sides
 * (collection.products and product.collections) are out of sync:
 *   1. IDs stored in collection.products (explicit ordering)
 *   2. Products that reference this collection via product.collections
 * The union is deduplicated; collection.products order is preserved first.
 */
async function getCollectionProductIds(
  collectionId: mongoose.Types.ObjectId,
  collectionProducts: unknown[],
): Promise<mongoose.Types.ObjectId[]> {
  const fromCollection = (collectionProducts ?? []).map((id: unknown) =>
    id instanceof mongoose.Types.ObjectId
      ? id
      : new mongoose.Types.ObjectId(String(id)),
  );

  // Always also scan products that carry this collection on their own side
  const tagged = await Product.find({
    collections: collectionId,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  const fromProducts = tagged.map((p) => p._id as mongoose.Types.ObjectId);

  // Build a deduplicated union; collection.products order comes first
  const idMap = new Map<string, mongoose.Types.ObjectId>();
  for (const id of fromCollection) idMap.set(String(id), id);
  for (const id of fromProducts) {
    if (!idMap.has(String(id))) idMap.set(String(id), id);
  }

  return [...idMap.values()];
}

collectionsRouter.get("/", optionalAdmin, async (req, res) => {
  try {
    const isAdmin = (req as AuthRequest & { isAdmin?: boolean }).isAdmin;
    const collections = await Collection.find({ deletedAt: null })
      .sort({ name: 1 })
      .lean();

    const collectionsWithProducts = await Promise.all(
      collections.map(async (c) => {
        const productIds = await getCollectionProductIds(
          c._id,
          c.products ?? [],
        );
        if (productIds.length === 0) {
          return { ...c, products: [] };
        }
        const productFilter: Record<string, unknown> = {
          _id: { $in: productIds },
          deletedAt: null,
        };
        if (!isAdmin) {
          productFilter.isActive = true;
        }
        const products = await Product.find(productFilter)
          .select(PRODUCT_SELECT)
          .lean();
        const orderMap = new Map(productIds.map((id, i) => [String(id), i]));
        const sorted = [...products].sort(
          (a, b) =>
            (orderMap.get(String(a._id)) ?? 0) -
            (orderMap.get(String(b._id)) ?? 0),
        );
        // For public requests, exclude out-of-stock products
        const visible = isAdmin ? sorted : await filterInStock(sorted);
        return { ...c, products: visible };
      }),
    );

    res.json({ collections: collectionsWithProducts });
  } catch (err) {
    console.error("GET /api/collections error:", err);
    res.status(500).json({ error: "Failed to list collections" });
  }
});

collectionsRouter.get("/id/:id", requireAdmin, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id).lean();
    if (!collection) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const productIds = await getCollectionProductIds(
      collection._id,
      collection.products ?? [],
    );
    const products =
      productIds.length > 0
        ? await Product.find({
            _id: { $in: productIds },
            deletedAt: null,
          })
            .select(PRODUCT_SELECT)
            .lean()
        : [];
    const orderMap = new Map(productIds.map((id, i) => [String(id), i]));
    const sorted = [...products].sort(
      (a, b) =>
        (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0),
    );
    res.json({ ...collection, products: sorted });
  } catch (err) {
    console.error("GET /api/collections/id/:id error:", err);
    res.status(500).json({ error: "Failed to get collection" });
  }
});

collectionsRouter.get("/:slug", optionalAdmin, async (req, res) => {
  try {
    const isAdmin = (req as AuthRequest & { isAdmin?: boolean }).isAdmin;
    const collection = await Collection.findOne({
      slug: req.params.slug,
      deletedAt: null,
    }).lean();
    if (!collection) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const productIds = await getCollectionProductIds(
      collection._id,
      collection.products ?? [],
    );
    if (productIds.length === 0) {
      return res.json({ ...collection, products: [] });
    }
    const productFilter: Record<string, unknown> = {
      _id: { $in: productIds },
      deletedAt: null,
    };
    if (!isAdmin) {
      productFilter.isActive = true;
    }
    const products = await Product.find(productFilter)
      .select(PRODUCT_SELECT)
      .lean();
    const orderMap = new Map(productIds.map((id, i) => [String(id), i]));
    const sorted = [...products].sort(
      (a, b) =>
        (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0),
    );
    // For public requests, exclude out-of-stock products
    const visible = isAdmin ? sorted : await filterInStock(sorted);
    res.json({ ...collection, products: visible });
  } catch (err) {
    console.error("GET /api/collections/:slug error:", err);
    res.status(500).json({ error: "Failed to get collection" });
  }
});

collectionsRouter.post("/", requireAdmin, async (req, res) => {
  const { name, slug, description, carouselDescription, showInCarousel, tags } = req.body;
  const slugValue = slug?.trim() || slugify(name);
  if (!name || !slugValue) {
    res
      .status(400)
      .json({ error: "name and slug (or name for auto-slug) required" });
    return;
  }

  // Process tags: ensure it's an array and filter out empty strings
  const tagsArray = Array.isArray(tags)
    ? tags.filter((t: string) => t && t.trim())
    : [];

  try {
    const collection = await Collection.create({
      name,
      slug: slugValue,
      description: description ?? "",
      carouselDescription: carouselDescription ?? "",
      showInCarousel: showInCarousel === true,
      tags: tagsArray,
      products: [],
    });
    res.status(201).json(collection);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Slug already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create collection" });
  }
});

collectionsRouter.put("/:id", requireAdmin, async (req, res) => {
  const { name, slug, description, carouselDescription, showInCarousel, tags } = req.body;
  const existingCollection = await Collection.findById(req.params.id).lean();
  if (!existingCollection) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (slug != null)
    updates.slug =
      (slug && String(slug).trim()) ||
      slugify(name ?? (existingCollection as any).name);
  if (description != null) updates.description = description;
  if (carouselDescription !== undefined) updates.carouselDescription = carouselDescription ?? "";
  if (typeof showInCarousel === "boolean") updates.showInCarousel = showInCarousel;
  if (tags !== undefined) {
    // Process tags: ensure it's an array and filter out empty strings
    updates.tags = Array.isArray(tags)
      ? tags.filter((t: string) => t && t.trim())
      : [];
  }

  try {
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true },
    )
      .populate("products", "name slug price images")
      .lean();

    if (!collection) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(collection);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Slug already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to update collection" });
  }
});

collectionsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Soft delete: set deletedAt
  collection.deletedAt = new Date();
  await collection.save();

  // Remove collection references from products
  await Product.updateMany(
    { collections: collection._id },
    { $pull: { collections: collection._id } },
  );

  res.json({ ok: true });
});

collectionsRouter.post("/:id/products", requireAdmin, async (req, res) => {
  const { productIds } = req.body;
  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds array required" });
    return;
  }

  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const productObjectIds = productIds.map(
    (id: string) => new mongoose.Types.ObjectId(id),
  );

  // Verify all products exist
  const products = await Product.find({ _id: { $in: productObjectIds } });
  if (products.length !== productIds.length) {
    res.status(400).json({ error: "One or more products not found" });
    return;
  }

  // Add products to collection (avoid duplicates)
  const newProductIds = productObjectIds.filter(
    (id) => !collection.products.some((p) => p.toString() === id.toString()),
  );
  if (newProductIds.length > 0) {
    collection.products.push(...newProductIds);
    await collection.save();
  }

  // Add collection to products (avoid duplicates) and auto-activate them
  // so they immediately appear on public-facing collection pages.
  await Product.updateMany(
    { _id: { $in: productObjectIds } },
    {
      $addToSet: { collections: collection._id },
      $set: { isActive: true },
    },
  );

  const updatedCollection = await Collection.findById(req.params.id)
    .populate("products", "name slug price images")
    .lean();

  res.json(updatedCollection);
});

collectionsRouter.delete(
  "/:id/products/:productId",
  requireAdmin,
  async (req, res) => {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }

    const productId = new mongoose.Types.ObjectId(req.params.productId);

    // Remove product from collection
    collection.products = collection.products.filter(
      (p) => p.toString() !== productId.toString(),
    );
    await collection.save();

    // Remove collection from product
    await Product.findByIdAndUpdate(productId, {
      $pull: { collections: collection._id },
    });

    const updatedCollection = await Collection.findById(req.params.id)
      .populate("products", "name slug price images")
      .lean();

    res.json(updatedCollection);
  },
);
