"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutRouter = void 0;
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const Cart_js_1 = require("../models/Cart.js");
const Order_js_1 = require("../models/Order.js");
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new stripe_1.default(stripeSecret) : null;
const getSessionId = (req) => {
    const id = req.headers["x-cart-session"];
    const s = Array.isArray(id) ? id[0] : id;
    return typeof s === "string" && s.trim() ? s.trim() : null;
};
exports.checkoutRouter = (0, express_1.Router)();
exports.checkoutRouter.post("/create", async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        res.status(400).json({ error: "Cart session required" });
        return;
    }
    const { paymentMethod, successUrl, cancelUrl, shippingAddress } = req.body;
    if (!shippingAddress?.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.country) {
        res.status(400).json({ error: "Valid shipping address required" });
        return;
    }
    const cart = await Cart_js_1.Cart.findOne({ sessionId }).populate("items.product");
    if (!cart || !cart.items.length) {
        res.status(400).json({ error: "Cart is empty" });
        return;
    }
    const lineItems = [];
    const stripeLineItems = [];
    for (const item of cart.items) {
        const product = item.product;
        if (!product)
            continue;
        lineItems.push({ product: product._id, quantity: item.quantity, price: product.price });
        stripeLineItems.push({
            price_data: {
                currency: "usd",
                product_data: { name: product.name ?? "Coral" },
                unit_amount: product.price,
            },
            quantity: item.quantity,
        });
    }
    if (lineItems.length === 0) {
        res.status(400).json({ error: "No valid items in cart" });
        return;
    }
    const order = await Order_js_1.Order.create({
        lineItems,
        shippingAddress,
        status: "pending",
    });
    if (paymentMethod === "stripe" && stripe) {
        try {
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items: stripeLineItems,
                success_url: successUrl ?? `${process.env.CLIENT_ORIGIN ?? "http://localhost:3000"}/checkout/success`,
                cancel_url: cancelUrl ?? `${process.env.CLIENT_ORIGIN ?? "http://localhost:3000"}/cart`,
                metadata: { orderId: order._id.toString() },
            });
            await Order_js_1.Order.updateOne({ _id: order._id }, { stripeCheckoutSessionId: session.id });
            res.json({ stripeUrl: session.url, orderId: order._id });
            return;
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Stripe checkout failed" });
            return;
        }
    }
    if (paymentMethod === "paypal") {
        res.status(501).json({ error: "PayPal not configured yet. Use Stripe for now.", orderId: order._id });
        return;
    }
    res.status(400).json({ error: "Choose paymentMethod: stripe or paypal", orderId: order._id });
});
