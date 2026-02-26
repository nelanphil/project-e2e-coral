"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const Order_js_1 = require("../models/Order.js");
const shipping = __importStar(require("../services/shipping.js"));
exports.ordersRouter = (0, express_1.Router)();
exports.ordersRouter.get("/", auth_js_1.requireAuth, async (req, res) => {
    const userId = req.userId;
    const orders = await Order_js_1.Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
});
exports.ordersRouter.get("/:id", auth_js_1.requireAuth, async (req, res) => {
    const userId = req.userId;
    const order = (await Order_js_1.Order.findById(req.params.id).populate("lineItems.product").lean());
    if (!order) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const orderUserId = order.user != null ? String(order.user) : null;
    if (orderUserId !== userId) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json(order);
});
exports.ordersRouter.get("/:id/rates", auth_js_1.requireAuth, auth_js_1.requireAdmin, async (req, res) => {
    const order = (await Order_js_1.Order.findById(req.params.id).lean());
    if (!order) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const { rates } = await shipping.getRates({ addressTo: order.shippingAddress });
    res.json({ rates });
});
exports.ordersRouter.post("/:id/ship", auth_js_1.requireAuth, auth_js_1.requireAdmin, async (req, res) => {
    const { rateId } = req.body;
    if (!rateId) {
        res.status(400).json({ error: "rateId required" });
        return;
    }
    const order = await Order_js_1.Order.findById(req.params.id).lean();
    if (!order) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const result = await shipping.createShipment({ addressTo: order.shippingAddress, rateId });
    if (!result) {
        res.status(500).json({ error: "Failed to create shipment" });
        return;
    }
    await Order_js_1.Order.updateOne({ _id: req.params.id }, { trackingNumber: result.trackingNumber, status: "shipped" });
    res.json({ trackingNumber: result.trackingNumber, labelUrl: result.labelUrl });
});
