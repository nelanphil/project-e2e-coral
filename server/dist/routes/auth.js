"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_js_1 = require("../middleware/auth.js");
const User_js_1 = require("../models/User.js");
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email?.trim() || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
    }
    const existing = await User_js_1.User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
        res.status(400).json({ error: "Email already registered" });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await User_js_1.User.create({
        email: email.trim().toLowerCase(),
        passwordHash,
        name: (name ?? "").trim(),
        role: "customer",
    });
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString() }, JWT_SECRET);
    res.status(201).json({
        token,
        user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    });
});
exports.authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
    }
    const user = await User_js_1.User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcryptjs_1.default.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString() }, JWT_SECRET);
    res.json({
        token,
        user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    });
});
exports.authRouter.get("/me", auth_js_1.requireAuth, async (req, res) => {
    const userId = req.userId;
    const user = (await User_js_1.User.findById(userId).select("-passwordHash").lean());
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json({ user: { _id: user._id, email: user.email, name: user.name, role: user.role } });
});
