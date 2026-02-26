"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const Order_js_1 = require("../models/Order.js");
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use(auth_js_1.requireAdmin);
exports.adminRouter.get("/orders", async (_req, res) => {
    const orders = await Order_js_1.Order.find().sort({ createdAt: -1 }).populate("lineItems.product").lean();
    res.json({ orders });
});
