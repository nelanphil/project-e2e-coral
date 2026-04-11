import { randomBytes, randomInt } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  requireAuth,
  updateUserVisit,
  type AuthRequest,
} from "../middleware/auth.js";
import type { IUser } from "../models/User.js";
import { User } from "../models/User.js";
import type { Request } from "express";
import { sendPasswordResetCodeEmail } from "../services/email.js";

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
  const { email, password, firstName, lastName } = req.body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };
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
  try {
    const user = await User.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: (firstName ?? "").trim(),
      lastName: (lastName ?? "").trim(),
      role: "customer",
      ipAddress,
      userAgent,
      visitCount: 1,
      lastVisit: new Date(),
    });
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
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
  if (
    !user.passwordHash ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);
  await updateUserVisit(user._id.toString(), ipAddress, userAgent);
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);
  const updatedUser = (await User.findById(user._id)
    .select("-passwordHash")
    .lean()) as IUser | null;
  res.json({
    token,
    user: {
      _id: updatedUser!._id,
      email: updatedUser!.email,
      firstName: updatedUser!.firstName,
      lastName: updatedUser!.lastName,
      role: updatedUser!.role,
    },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = (await User.findById(userId)
    .select("-passwordHash")
    .lean()) as IUser | null;
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
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  }
});

authRouter.post("/check-email", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: "Email required" });
    return;
  }
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
    role: { $ne: "guest" },
  })
    .select("_id")
    .lean();
  res.json({ exists: !!user });
});

authRouter.post("/guest", async (req, res) => {
  const { cookieId, referrer } = req.body as {
    cookieId?: string;
    referrer?: string;
  };
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
    user = await User.findById(user._id).lean<IUser | null>();
  } else {
    // Create new guest user
    try {
      user = await User.create({
        cookieId: cookieId.trim(),
        role: "guest",
        firstName: "",
        lastName: "",
        ipAddress,
        userAgent,
        referrer,
        visitCount: 1,
        lastVisit: new Date(),
      });
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        // Race condition: guest was created between findOne and create
        user = await User.findOne({
          cookieId: cookieId.trim(),
          role: "guest",
        }).lean<IUser | null>();
        if (!user) {
          res.status(500).json({ error: "Failed to create guest user" });
          return;
        }
      } else {
        throw err;
      }
    }
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

const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for this email, we've sent a 6-digit code. Check your inbox.";

function buildClientOrigin(): string {
  return (process.env.CLIENT_ORIGIN ?? "http://localhost:3003").replace(
    /\/$/,
    "",
  );
}

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: "Email required" });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({
    email: normalizedEmail,
    role: { $ne: "guest" },
    passwordHash: { $exists: true, $ne: "" },
  });

  if (user?.passwordHash) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const passwordResetCodeHash = await bcrypt.hash(code, 10);
    const passwordResetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.passwordResetCodeHash = passwordResetCodeHash;
    user.passwordResetCodeExpiresAt = passwordResetCodeExpiresAt;
    await user.save();

    const resetPageUrl = `${buildClientOrigin()}/auth/reset-password?email=${encodeURIComponent(normalizedEmail)}`;
    const sent = await sendPasswordResetCodeEmail(
      normalizedEmail,
      code,
      resetPageUrl,
    );
    if (!sent) {
      console.warn(
        `Password reset requested for ${normalizedEmail} but email was not sent (transport not configured)`,
      );
    }
  }

  res.json({ message: FORGOT_PASSWORD_MESSAGE });
});

authRouter.post("/verify-reset-code", async (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email?.trim() || !code) {
    res.status(400).json({ error: "Email and code are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const digitsOnly = String(code).replace(/\D/g, "");
  if (digitsOnly.length !== 6) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const user = await User.findOne({
    email: normalizedEmail,
    role: { $ne: "guest" },
    passwordHash: { $exists: true, $ne: "" },
  });

  if (
    !user?.passwordResetCodeHash ||
    !user.passwordResetCodeExpiresAt ||
    user.passwordResetCodeExpiresAt <= new Date()
  ) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const codeOk = await bcrypt.compare(digitsOnly, user.passwordResetCodeHash);
  if (!codeOk) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const proof = randomBytes(32).toString("hex");
  user.passwordResetTokenHash = await bcrypt.hash(proof, 10);
  user.passwordResetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  user.passwordResetCodeHash = undefined;
  user.passwordResetCodeExpiresAt = undefined;
  await user.save();

  const resetToken = jwt.sign(
    {
      purpose: "pwd_reset",
      userId: user._id.toString(),
      proof,
    },
    JWT_SECRET,
    { expiresIn: "15m" },
  );

  res.json({ resetToken });
});

authRouter.post("/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body as {
    resetToken?: string;
    newPassword?: string;
  };

  if (!resetToken || !newPassword) {
    res
      .status(400)
      .json({ error: "Reset token and new password are required" });
    return;
  }

  if (newPassword.length < 8) {
    res
      .status(400)
      .json({ error: "New password must be at least 8 characters" });
    return;
  }

  let payload: { purpose?: string; userId?: string; proof?: string };
  try {
    payload = jwt.verify(resetToken, JWT_SECRET) as {
      purpose?: string;
      userId?: string;
      proof?: string;
    };
  } catch {
    res.status(400).json({ error: "Invalid or expired reset session" });
    return;
  }

  if (
    payload.purpose !== "pwd_reset" ||
    !payload.userId ||
    typeof payload.proof !== "string"
  ) {
    res.status(400).json({ error: "Invalid or expired reset session" });
    return;
  }

  const user = await User.findById(payload.userId);
  if (
    !user ||
    user.role === "guest" ||
    !user.passwordResetTokenHash ||
    !user.passwordResetTokenExpiresAt ||
    user.passwordResetTokenExpiresAt <= new Date()
  ) {
    res.status(400).json({ error: "Invalid or expired reset session" });
    return;
  }

  const proofOk = await bcrypt.compare(
    payload.proof,
    user.passwordResetTokenHash,
  );
  if (!proofOk) {
    res.status(400).json({ error: "Invalid or expired reset session" });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  user.passwordResetCodeHash = undefined;
  user.passwordResetCodeExpiresAt = undefined;
  await user.save();

  res.json({ message: "Password updated successfully" });
});

// ─── Change Password ─────────────────────────────────────────────────────────

authRouter.put("/change-password", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res
      .status(400)
      .json({ error: "Current password and new password are required" });
    return;
  }

  if (newPassword.length < 8) {
    res
      .status(400)
      .json({ error: "New password must be at least 8 characters" });
    return;
  }

  const user = await User.findById(userId);
  if (!user || user.role === "guest") {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (
    !user.passwordHash ||
    !(await bcrypt.compare(currentPassword, user.passwordHash))
  ) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password updated successfully" });
});
