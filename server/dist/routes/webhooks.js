"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksRouter = void 0;
exports.handleStripeWebhook = handleStripeWebhook;
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const Order_js_1 = require("../models/Order.js");
const Product_js_1 = require("../models/Product.js");
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret ? new stripe_1.default(stripeSecret) : null;
async function handleStripeWebhook(req, res) {
    if (!stripe || !stripeWebhookSecret) {
        res.sendStatus(200);
        return;
    }
    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") {
        res.status(400).send("Missing signature");
        return;
    }
    const rawBody = req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
        res.status(400).send("Raw body required for webhook");
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
    }
    catch (err) {
        res.status(400).send(`Webhook signature verification failed: ${err.message}`);
        return;
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (orderId) {
            const order = await Order_js_1.Order.findById(orderId);
            if (order && order.status === "pending") {
                order.status = "paid";
                if (session.payment_intent)
                    order.stripePaymentIntentId = String(session.payment_intent);
                await order.save();
                for (const item of order.lineItems) {
                    await Product_js_1.Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } });
                }
            }
        }
    }
    res.sendStatus(200);
}
exports.webhooksRouter = (0, express_1.Router)();
exports.webhooksRouter.post("/paypal", (_req, res) => {
    res.sendStatus(200);
});
