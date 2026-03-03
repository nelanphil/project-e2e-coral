import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { ContactSubmission } from "../models/ContactSubmission.js";

export const contactRouter = Router();

contactRouter.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  };
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  try {
    const submission = await ContactSubmission.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    });
    res.status(201).json({ success: true, id: submission._id });
  } catch {
    res.status(500).json({ error: "Failed to submit message" });
  }
});

contactRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const skip = (page - 1) * limit;
    const [submissions, total] = await Promise.all([
      ContactSubmission.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ContactSubmission.countDocuments(),
    ]);
    res.json({ submissions, total, page, limit });
  } catch {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

contactRouter.patch("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: "new" | "read" };
  if (!status || !["new", "read"].includes(status)) {
    res.status(400).json({ error: "status must be 'new' or 'read'" });
    return;
  }
  try {
    const submission = await ContactSubmission.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    res.json({ submission });
  } catch {
    res.status(500).json({ error: "Failed to update submission" });
  }
});
