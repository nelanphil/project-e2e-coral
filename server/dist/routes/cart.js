"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRouter = void 0;
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Cart_js_1 = require("../models/Cart.js");
exports.cartRouter = (0, express_1.Router)();
function getSessionId(req) {
    const id = req.headers["x-cart-session"];
    const s = Array.isArray(id) ? id[0] : id;
    return typeof s === "string" && s.trim() ? s.trim() : null;
}
exports.cartRouter.get("/", async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        res.json({ items: [], sessionId: null });
        return;
    }
    try {
        const cart = await Cart_js_1.Cart.findOne({ sessionId }).populate("items.product").lean();
        if (!cart) {
            res.json({ items: cartItemsToResponse([]), sessionId });
            return;
        }
        const items = cart.items.map((i) => ({
            productId: i.product?._id,
            name: i.product?.name,
            slug: i.product?.slug,
            price: i.product?.price,
            quantity: i.quantity,
        })).filter(Boolean);
        res.json({ items, sessionId });
    }
    catch {
        res.status(500).json({ error: "Failed to get cart" });
    }
});
function cartItemsToResponse(items) {
    return items.map((i) => ({
        productId: i.product?._id,
        quantity: i.quantity,
    }));
}
exports.cartRouter.post("/", async (req, res) => {
    const sessionId = getSessionId(req) ?? new mongoose_1.default.Types.ObjectId().toString();
    const { productId, quantity = 1 } = req.body;
    if (!productId || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
        res.status(400).json({ error: "Invalid productId" });
        return;
    }
    const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
    try {
        let cart = await Cart_js_1.Cart.findOne({ sessionId });
        if (!cart) {
            cart = await Cart_js_1.Cart.create({ sessionId, items: [] });
        }
        const existing = cart.items.find((i) => i.product.toString() === productId);
        if (existing) {
            existing.quantity = Math.min(99, existing.quantity + qty);
        }
        else {
            cart.items.push({ product: new mongoose_1.default.Types.ObjectId(productId), quantity: qty });
        }
        await cart.save();
        const populated = (await Cart_js_1.Cart.findById(cart._id).populate("items.product").lean());
        const items = (populated?.items ?? []).map((i) => ({
            productId: i.product?._id,
            name: i.product?.name,
            slug: i.product?.slug,
            price: i.product?.price,
            quantity: i.quantity,
        }));
        res.setHeader("X-Cart-Session", sessionId);
        res.json({ items, sessionId });
    }
    catch {
        res.status(500).json({ error: "Failed to add to cart" });
    }
});
exports.cartRouter.delete("/:productId", async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        res.status(400).json({ error: "Session required" });
        return;
    }
    const { productId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        res.status(400).json({ error: "Invalid productId" });
        return;
    }
    try {
        const cart = await Cart_js_1.Cart.findOne({ sessionId });
        if (!cart) {
            res.json({ items: [], sessionId });
            return;
        }
        cart.items = cart.items.filter((i) => i.product.toString() !== productId);
        await cart.save();
        const populated = await Cart_js_1.Cart.findById(cart._id).populate("items.product").lean();
        const items = (populated?.items ?? []).map((i) => ({
            productId: i.product?._id,
            name: i.product?.name,
            slug: i.product?.slug,
            price: i.product?.price,
            quantity: i.quantity,
        }));
        res.json({ items, sessionId });
    }
    catch {
        res.status(500).json({ error: "Failed to update cart" });
    }
});
