import { Router } from "express";
import mongoose from "mongoose";
import { requireAdmin } from "../middleware/auth.js";
import { Collection } from "../models/Collection.js";
import { Product, type IProduct } from "../models/Product.js";
import { Inventory } from "../models/Inventory.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { PriceLog } from "../models/PriceLog.js";

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(
      150,
      Math.max(1, parseInt(String(req.query.limit), 10) || 12),
    );
    const category = req.query.category as string | undefined;
    const q = req.query.q as string | undefined;
    const sortField = req.query.sort as string | undefined;
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const allowedSortFields: Record<string, string> = {
      name: "name",
      createdAt: "createdAt",
      isActive: "isActive",
      category: "category",
      price: "price",
      compareAtPrice: "compareAtPrice",
      collections: "collections",
    };

    const status = req.query.status as string | undefined;
    const includeHidden = req.query.hidden === "include";

    const filter: Record<string, unknown> = {};
    if (status === "inactive") {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
      if (!includeHidden) {
        // Match true and undefined (aligns with inventory: isActive !== false)
        filter.isActive = { $ne: false };
      }
    }
    if (category && mongoose.Types.ObjectId.isValid(category))
      filter.category = new mongoose.Types.ObjectId(category);
    if (q?.trim()) {
      const search = q.trim();
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const sortByQuantity = sortField === "quantity" || sortField === "qty";
    const sortKey = allowedSortFields[sortField ?? ""] ?? "createdAt";
    const sortObj: Record<string, 1 | -1> = { [sortKey]: sortOrder };

    const skip = (page - 1) * limit;

    // When excluding hidden, get real in-stock count so store total is accurate
    let inStockTotal: number | null = null;
    if (!includeHidden) {
      const countResult = await Product.aggregate<{ total: number }>([
        { $match: filter },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "product",
            as: "_inv",
          },
        },
        {
          $addFields: {
            _q: { $ifNull: [{ $arrayElemAt: ["$_inv.quantity", 0] }, 0] },
          },
        },
        { $match: { _q: { $gt: 0 } } },
        { $count: "total" },
      ]);
      inStockTotal = countResult[0]?.total ?? 0;
    }

    let products: unknown[];
    let total: number;

    if (sortByQuantity) {
      // Use aggregation to sort by inventory quantity
      const pipeline: mongoose.PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "product",
            as: "_inv",
          },
        },
        {
          $addFields: {
            _quantity: {
              $ifNull: [{ $arrayElemAt: ["$_inv.quantity", 0] }, 0],
            },
          },
        },
        ...(!includeHidden ? [{ $match: { _quantity: { $gt: 0 } } }] : []),
        { $sort: { _quantity: sortOrder } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDoc",
          },
        },
        {
          $lookup: {
            from: "collections",
            localField: "collections",
            foreignField: "_id",
            as: "collectionsDoc",
          },
        },
        {
          $addFields: {
            category: {
              _id: "$category",
              name: { $arrayElemAt: ["$categoryDoc.name", 0] },
              slug: { $arrayElemAt: ["$categoryDoc.slug", 0] },
            },
            collections: {
              $map: {
                input: "$collectionsDoc",
                as: "c",
                in: {
                  _id: "$$c._id",
                  name: "$$c.name",
                  slug: "$$c.slug",
                },
              },
            },
            inventory: { quantity: "$_quantity" },
          },
        },
        {
          $project: {
            categoryDoc: 0,
            collectionsDoc: 0,
            _inv: 0,
            _quantity: 0,
          },
        },
      ];
      const aggResult =
        await Product.aggregate<Record<string, unknown>>(pipeline);
      products = aggResult;
      total = includeHidden
        ? await Product.countDocuments(filter)
        : (inStockTotal ?? 0);
    } else if (!includeHidden) {
      // Paginate over in-stock products only so store sees correct total and page size
      const pipeline: mongoose.PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "product",
            as: "_inv",
          },
        },
        {
          $addFields: {
            _quantity: {
              $ifNull: [{ $arrayElemAt: ["$_inv.quantity", 0] }, 0],
            },
          },
        },
        { $match: { _quantity: { $gt: 0 } } },
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDoc",
          },
        },
        {
          $lookup: {
            from: "collections",
            localField: "collections",
            foreignField: "_id",
            as: "collectionsDoc",
          },
        },
        {
          $addFields: {
            category: {
              _id: "$category",
              name: { $arrayElemAt: ["$categoryDoc.name", 0] },
              slug: { $arrayElemAt: ["$categoryDoc.slug", 0] },
            },
            collections: {
              $map: {
                input: "$collectionsDoc",
                as: "c",
                in: {
                  _id: "$$c._id",
                  name: "$$c.name",
                  slug: "$$c.slug",
                },
              },
            },
            inventory: { quantity: "$_quantity" },
          },
        },
        {
          $project: {
            categoryDoc: 0,
            collectionsDoc: 0,
            _inv: 0,
            _quantity: 0,
          },
        },
      ];
      products = await Product.aggregate<Record<string, unknown>>(pipeline);
      total = inStockTotal ?? 0;
    } else {
      [products, total] = await Promise.all([
        Product.find(filter)
          .populate("category", "name slug")
          .populate("collections", "name slug")
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
      ]);
      const productIds = (products as { _id: unknown }[]).map((p) => p._id);
      const inventories = await Inventory.find({
        product: { $in: productIds },
      }).lean();
      const inventoryMap = new Map(
        inventories.map((inv) => [String(inv.product), inv]),
      );
      products = (products as Record<string, unknown>[]).map((p) => {
        const inv = inventoryMap.get(String(p._id));
        return { ...p, inventory: { quantity: inv?.quantity ?? 0 } };
      });
    }

    const productsWithInventory = products as {
      inventory?: { quantity: number };
    }[];

    // For public (non-admin), we already filtered to in-stock in aggregation paths
    const visibleProducts = includeHidden
      ? productsWithInventory
      : productsWithInventory.filter((p) => (p.inventory?.quantity ?? 0) > 0);

    const visibleTotal = includeHidden ? total : (inStockTotal ?? total);

    res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.json({ products: visibleProducts, total: visibleTotal, page, limit });
  } catch (err) {
    res.status(500).json({ error: "Failed to list products" });
  }
});

productsRouter.get("/id/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("collections", "name slug")
      .lean<IProduct | null>();
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const inv = await Inventory.findOne({ product: product._id }).lean<{
      quantity?: number;
    } | null>();
    res.json({ ...product, inventory: { quantity: inv?.quantity ?? 0 } });
  } catch {
    res.status(500).json({ error: "Failed to get product" });
  }
});

productsRouter.get("/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      deletedAt: null,
      isActive: { $ne: false },
    })
      .populate("category", "name slug")
      .lean<IProduct | null>();
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const inv = await Inventory.findOne({ product: product._id }).lean<{
      quantity?: number;
    } | null>();
    res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.json({ ...product, inventory: { quantity: inv?.quantity ?? 0 } });
  } catch {
    res.status(500).json({ error: "Failed to get product" });
  }
});

productsRouter.post("/", requireAdmin, async (req, res) => {
  const {
    name,
    slug,
    sku,
    description,
    metaTitle,
    metaDescription,
    images,
    price,
    compareAtPrice,
    cost,
    category,
    quantity,
    collections,
    attributes,
    whyChoose,
    keyFeatures,
    colorVariation,
    growthHabit,
    optimalCare,
    idealCompatibility,
  } = req.body;
  const slugValue = slug?.trim() || slugify(name);
  if (!name || !slugValue || price == null || !category) {
    res.status(400).json({
      error: "name, slug (or name for auto-slug), price, category required",
    });
    return;
  }

  const numericPrice = Number(price);
  const autoActive = numericPrice > 0;

  const collectionIds = Array.isArray(collections)
    ? collections.map((id: string) => new mongoose.Types.ObjectId(id))
    : [];

  const product = await Product.create({
    name,
    slug: slugValue,
    sku: sku?.trim() || null,
    description: description ?? "",
    metaTitle: metaTitle?.trim() || null,
    metaDescription: metaDescription?.trim() || null,
    images: Array.isArray(images) ? images : [],
    price: numericPrice,
    compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
    cost: Number(cost) || 0,
    category: new mongoose.Types.ObjectId(category),
    collections: collectionIds,
    attributes: attributes && typeof attributes === "object" ? attributes : {},
    whyChoose: whyChoose?.trim() || null,
    keyFeatures: keyFeatures?.trim() || null,
    colorVariation: colorVariation?.trim() || null,
    growthHabit: growthHabit?.trim() || null,
    optimalCare: optimalCare?.trim() || null,
    idealCompatibility: idealCompatibility?.trim() || null,
    isActive: autoActive,
  });

  for (const collectionId of collectionIds) {
    await Collection.findByIdAndUpdate(collectionId, {
      $addToSet: { products: product._id },
    });
  }

  const qty = Number(quantity) || 0;
  const inv = await Inventory.create({ product: product._id, quantity: qty });

  const createUserId = (req as any).userId;

  if (qty > 0) {
    await InventoryLog.create({
      product: product._id,
      quantityBefore: 0,
      quantityAfter: qty,
      change: qty,
      reason: "manual",
      performedBy: createUserId,
    });
  }

  if (Number(price) > 0) {
    await PriceLog.create({
      product: product._id,
      field: "price",
      valueBefore: 0,
      valueAfter: Number(price),
      changedBy: createUserId,
    });
  }

  if (Number(cost) > 0) {
    await PriceLog.create({
      product: product._id,
      field: "cost",
      valueBefore: 0,
      valueAfter: Number(cost),
      changedBy: createUserId,
    });
  }

  if (compareAtPrice && Number(compareAtPrice) > 0) {
    await PriceLog.create({
      product: product._id,
      field: "compareAtPrice",
      valueBefore: 0,
      valueAfter: Number(compareAtPrice),
      changedBy: createUserId,
    });
  }

  res
    .status(201)
    .json({ ...product.toObject(), inventory: { quantity: inv.quantity } });
});

productsRouter.put("/:id", requireAdmin, async (req, res) => {
  const updates = req.body;
  const existingProduct = await Product.findById(
    req.params.id,
  ).lean<IProduct | null>();
  if (!existingProduct) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const productUpdate: Record<string, unknown> = {};
  if (updates.name != null) productUpdate.name = updates.name;
  if (updates.slug != null)
    productUpdate.slug =
      (updates.slug && String(updates.slug).trim()) ||
      slugify(updates.name ?? (existingProduct as any).name);
  if (updates.sku !== undefined)
    productUpdate.sku = updates.sku?.trim() || null;
  if (updates.description != null)
    productUpdate.description = updates.description;
  if (updates.metaTitle !== undefined)
    productUpdate.metaTitle = updates.metaTitle?.trim() || null;
  if (updates.metaDescription !== undefined)
    productUpdate.metaDescription = updates.metaDescription?.trim() || null;
  if (updates.images != null)
    productUpdate.images = Array.isArray(updates.images) ? updates.images : [];
  if (updates.price != null) productUpdate.price = Number(updates.price);
  if (updates.compareAtPrice !== undefined)
    productUpdate.compareAtPrice = updates.compareAtPrice
      ? Number(updates.compareAtPrice)
      : null;
  if (updates.cost != null) productUpdate.cost = Number(updates.cost);
  if (updates.category != null)
    productUpdate.category = new mongoose.Types.ObjectId(updates.category);
  if (updates.collections !== undefined) {
    productUpdate.collections = Array.isArray(updates.collections)
      ? updates.collections.map((id: string) => new mongoose.Types.ObjectId(id))
      : [];
  }
  if (updates.attributes !== undefined) {
    productUpdate.attributes =
      updates.attributes && typeof updates.attributes === "object"
        ? updates.attributes
        : {};
  }
  if (updates.whyChoose !== undefined)
    productUpdate.whyChoose = updates.whyChoose?.trim() || null;
  if (updates.keyFeatures !== undefined)
    productUpdate.keyFeatures = updates.keyFeatures?.trim() || null;
  if (updates.colorVariation !== undefined)
    productUpdate.colorVariation = updates.colorVariation?.trim() || null;
  if (updates.growthHabit !== undefined)
    productUpdate.growthHabit = updates.growthHabit?.trim() || null;
  if (updates.optimalCare !== undefined)
    productUpdate.optimalCare = updates.optimalCare?.trim() || null;
  if (updates.idealCompatibility !== undefined)
    productUpdate.idealCompatibility =
      updates.idealCompatibility?.trim() || null;
  if (updates.isActive !== undefined) {
    productUpdate.isActive = Boolean(updates.isActive);
  }

  // Auto-activate the product if it is being assigned to at least one collection
  // and the caller didn't explicitly set isActive to false.
  if (
    updates.collections !== undefined &&
    ((productUpdate.collections as mongoose.Types.ObjectId[]) ?? []).length >
      0 &&
    updates.isActive === undefined
  ) {
    productUpdate.isActive = true;
  }

  const effectivePrice =
    productUpdate.price != null
      ? (productUpdate.price as number)
      : existingProduct.price;
  if (effectivePrice <= 0 && updates.isActive === undefined) {
    productUpdate.isActive = false;
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    productUpdate,
    { new: true },
  ).lean<IProduct | null>();

  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (updates.collections !== undefined) {
    const productId = new mongoose.Types.ObjectId(req.params.id);
    const toIdStr = (c: unknown) =>
      c && typeof c === "object" && "_id" in c
        ? String((c as { _id: unknown })._id)
        : String(c);
    const oldIds = new Set<string>(
      ((existingProduct as any).collections ?? []).map(toIdStr),
    );
    const newIds = new Set<string>(
      ((productUpdate.collections as mongoose.Types.ObjectId[]) ?? []).map(
        (c) => String(c),
      ),
    );
    const removed = [...oldIds].filter((id) => !newIds.has(id));
    const added = [...newIds].filter((id) => !oldIds.has(id));
    await Promise.all([
      ...removed.map((collectionId) =>
        Collection.findByIdAndUpdate(collectionId, {
          $pull: { products: productId },
        }),
      ),
      ...added.map((collectionId) =>
        Collection.findByIdAndUpdate(collectionId, {
          $addToSet: { products: productId },
        }),
      ),
    ]);
  }

  const userId = (req as any).userId;

  const validPriceReasons = [
    "promotion",
    "cost_change",
    "market_adjustment",
    "correction",
    "other",
  ];
  const priceReason = validPriceReasons.includes(updates.priceReason)
    ? updates.priceReason
    : "correction";
  const priceNotes = updates.priceNotes?.trim() || "";

  if (
    updates.price != null &&
    Number(updates.price) !== existingProduct.price
  ) {
    await PriceLog.create({
      product: product._id,
      field: "price",
      valueBefore: existingProduct.price,
      valueAfter: Number(updates.price),
      reason: priceReason,
      notes: priceNotes,
      changedBy: userId,
    });
  }

  if (
    updates.cost != null &&
    Number(updates.cost) !== (existingProduct as any).cost
  ) {
    await PriceLog.create({
      product: product._id,
      field: "cost",
      valueBefore: (existingProduct as any).cost ?? 0,
      valueAfter: Number(updates.cost),
      reason: priceReason,
      notes: priceNotes,
      changedBy: userId,
    });
  }

  if (updates.compareAtPrice !== undefined) {
    const oldVal = (existingProduct as any).compareAtPrice ?? 0;
    const newVal = updates.compareAtPrice ? Number(updates.compareAtPrice) : 0;
    if (newVal !== oldVal) {
      await PriceLog.create({
        product: product._id,
        field: "compareAtPrice",
        valueBefore: oldVal,
        valueAfter: newVal,
        reason: priceReason,
        notes: priceNotes,
        changedBy: userId,
      });
    }
  }

  let inv = await Inventory.findOne({ product: product._id });
  if (!inv) {
    inv = await Inventory.create({ product: product._id, quantity: 0 });
  }

  if (updates.quantity != null) {
    const newQty = Number(updates.quantity);
    const oldQty = inv.quantity;
    if (newQty !== oldQty) {
      inv.quantity = newQty;
      await inv.save();
      const reason = ["manual", "sale", "restock", "adjustment"].includes(
        updates.inventoryReason,
      )
        ? updates.inventoryReason
        : "manual";
      await InventoryLog.create({
        product: product._id,
        quantityBefore: oldQty,
        quantityAfter: newQty,
        change: newQty - oldQty,
        reason,
        notes: updates.inventoryNotes?.trim() || "",
        performedBy: userId,
      });
    }
  }

  res.json({ ...product, inventory: { quantity: inv.quantity } });
});

productsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  product.deletedAt = new Date();
  await product.save();
  res.json({ ok: true });
});

productsRouter.patch("/:id/restore", requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  product.deletedAt = null;
  await product.save();
  res.json({ ok: true });
});

productsRouter.patch("/:id/visibility", requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { isActive } = req.body;
  if (isActive && (!product.price || product.price <= 0)) {
    res.status(400).json({
      error: "Cannot activate a product with no price. Set a price first.",
    });
    return;
  }
  product.isActive = Boolean(isActive);
  await product.save();
  res.json({ ok: true, isActive: product.isActive });
});
