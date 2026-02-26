"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const admin_js_1 = require("./routes/admin.js");
const auth_js_1 = require("./routes/auth.js");
const products_js_1 = require("./routes/products.js");
const categories_js_1 = require("./routes/categories.js");
const cart_js_1 = require("./routes/cart.js");
const orders_js_1 = require("./routes/orders.js");
const checkout_js_1 = require("./routes/checkout.js");
const webhooks_js_1 = require("./routes/webhooks.js");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000" }));
app.post("/api/webhooks/stripe", express_1.default.raw({ type: "application/json" }), webhooks_js_1.handleStripeWebhook);
app.use(express_1.default.json());
app.use("/api/auth", auth_js_1.authRouter);
app.use("/api/admin", admin_js_1.adminRouter);
app.use("/api/products", products_js_1.productsRouter);
app.use("/api/categories", categories_js_1.categoriesRouter);
app.use("/api/cart", cart_js_1.cartRouter);
app.use("/api/orders", orders_js_1.ordersRouter);
app.use("/api/checkout", checkout_js_1.checkoutRouter);
app.use("/api/webhooks", webhooks_js_1.webhooksRouter);
app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
app.use(errorHandler_js_1.errorHandler);
exports.default = app;
