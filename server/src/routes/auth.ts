import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth, updateUserVisit, type AuthRequest } from "../middleware/auth.js";
import type { IUser } from "../models/User.js";
import { User } from "../models/User.js";
import type { Request } from "express";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export const authRouter = Router();

function getIpAddress(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.socket.remoteAddress;
}

function getUserAgent(req: Request): string | undefined {
  return req.headers["user-agent"];
}

authRouter.post("/sign-up", async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);
  const user = await User.create({
    email: email.trim().toLowerCase(),
    passwordHash,
    name: (name ?? "").trim(),
    role: "customer",
    ipAddress,
    userAgent,
    visitCount: 1,
    lastVisit: new Date(),
  });
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);
  res.status(201).json({
    token,
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || user.role === "guest") {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);
  await updateUserVisit(user._id.toString(), ipAddress, userAgent);
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);
  const updatedUser = await User.findById(user._id).select("-passwordHash").lean() as IUser | null;
  res.json({
    token,
    user: { _id: updatedUser!._id, email: updatedUser!.email, name: updatedUser!.name, role: updatedUser!.role },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = (await User.findById(userId).select("-passwordHash").lean()) as IUser | null;
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // Update visit tracking for customer/admin users
  if (user.role !== "guest") {
    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);
    await updateUserVisit(userId, ipAddress, userAgent);
  }
  // Return appropriate user data based on role
  if (user.role === "guest") {
    res.json({
      user: {
        _id: user._id,
        cookieId: user.cookieId,
        role: user.role,
        visitCount: user.visitCount,
        lastVisit: user.lastVisit,
      },
    });
  } else {
    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }
});

authRouter.post("/guest", async (req, res) => {
  const { cookieId, referrer } = req.body as { cookieId?: string; referrer?: string };
  if (!cookieId?.trim()) {
    res.status(400).json({ error: "Cookie ID required" });
    return;
  }
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);
  
  let user = await User.findOne({ cookieId: cookieId.trim(), role: "guest" });
  
  if (user) {
    // Update existing guest user
    await User.findByIdAndUpdate(user._id, {
      $inc: { visitCount: 1 },
      lastVisit: new Date(),
      ipAddress,
      userAgent,
      referrer: referrer || user.referrer,
    });
    user = await User.findById(user._id).lean() as IUser;
  } else {
    // Create new guest user
    user = await User.create({
      cookieId: cookieId.trim(),
      role: "guest",
      name: "",
      ipAddress,
      userAgent,
      referrer,
      visitCount: 1,
      lastVisit: new Date(),
    });
  }
  
  res.json({
    user: {
      _id: user._id,
      cookieId: user.cookieId,
      role: user.role,
      visitCount: user.visitCount,
      lastVisit: user.lastVisit,
    },
  });
});
