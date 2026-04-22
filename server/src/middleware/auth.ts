import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { IUser } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
  } catch {
    // ignore invalid token
  }
  next();
}

export async function requireCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  const { User } = await import("../models/User.js");
  const user = (await User.findById(req.userId).lean()) as IUser | null;
  if (!user || user.role === "guest") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  const { User } = await import("../models/User.js");
  const user = (await User.findById(req.userId).lean()) as IUser | null;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export async function updateUserVisit(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const { User } = await import("../models/User.js");
  const updateData: { visitCount?: number; lastVisit: Date; ipAddress?: string; userAgent?: string } = {
    lastVisit: new Date(),
  };
  
  if (ipAddress) {
    updateData.ipAddress = ipAddress;
  }
  if (userAgent) {
    updateData.userAgent = userAgent;
  }
  
  await User.findByIdAndUpdate(userId, {
    $inc: { visitCount: 1 },
    ...updateData,
  });
}
