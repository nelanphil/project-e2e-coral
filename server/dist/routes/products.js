"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const auth_js_1 = require("../middleware/auth.js");
const Product_js_1 = require("../models/Product.js");
exports.productsRouter = (0, express_1.Router)();
exports.productsRouter.get("/", async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 12));
        const category = req.query.category;
        const q = req.query.q;
        const filter = {};
        if (category)
            filter.category = category;
        if (q?.trim()) {
            const search = q.trim();
            filter.$or = [
                { name: new RegExp(search, "i") },
                { description: new RegExp(search, "i") },
            ];
        }
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            Product_js_1.Product.find(filter).populate("category", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Product_js_1.Product.countDocuments(filter),
        ]);
        res.json({ products, total, page, limit });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to list products" });
    }
});
exports.productsRouter.get("/id/:id", auth_js_1.requireAdmin, async (req, res) => {
    try {
        const product = await Product_js_1.Product.findById(req.params.id).populate("category", "name slug").lean();
        if (!product) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json(product);
    }
    catch {
        res.status(500).json({ error: "Failed to get product" });
    }
});
exports.productsRouter.get("/:slug", async (req, res) => {
    try {
        const product = await Product_js_1.Product.findOne({ slug: req.params.slug })
            .populate("category", "name slug")
            .lean();
        if (!product) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json(product);
    }
    catch {
        res.status(500).json({ error: "Failed to get product" });
    }
});
exports.productsRouter.post("/", auth_js_1.requireAdmin, async (req, res) => {
    const { name, slug, description, images, price, category, stock } = req.body;
    if (!name || !slug || price == null || !category) {
        res.status(400).json({ error: "name, slug, price, category required" });
        return;
    }
    const product = await Product_js_1.Product.create({
        name,
        slug,
        description: description ?? "",
        images: Array.isArray(images) ? images : [],
        price: Number(price),
        category: new mongoose_1.default.Types.ObjectId(category),
        stock: Number(stock) || 0,
    });
    res.status(201).json(product);
});
exports.productsRouter.put("/:id", auth_js_1.requireAdmin, async (req, res) => {
    const updates = req.body;
    const product = await Product_js_1.Product.findByIdAndUpdate(req.params.id, {
        ...(updates.name != null && { name: updates.name }),
        ...(updates.slug != null && { slug: updates.slug }),
        ...(updates.description != null && { description: updates.description }),
        ...(updates.images != null && { images: Array.isArray(updates.images) ? updates.images : [] }),
        ...(updates.price != null && { price: Number(updates.price) }),
        ...(updates.category != null && { category: new mongoose_1.default.Types.ObjectId(updates.category) }),
        ...(updates.stock != null && { stock: Number(updates.stock) }),
    }, { new: true }).lean();
    if (!product) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json(product);
});
exports.productsRouter.delete("/:id", auth_js_1.requireAdmin, async (req, res) => {
    const result = await Product_js_1.Product.findByIdAndDelete(req.params.id);
    if (!result) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json({ ok: true });
});
