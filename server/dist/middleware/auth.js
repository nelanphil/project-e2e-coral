"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = payload.userId;
        next();
    }
    catch {
        res.status(401).json({ error: "Unauthorized" });
    }
}
async function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        next();
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = payload.userId;
    }
    catch {
        // ignore invalid token
    }
    next();
}
async function requireAdmin(req, res, next) {
    if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { User } = await import("../models/User.js");
    const user = (await User.findById(req.userId).lean());
    if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    next();
}
