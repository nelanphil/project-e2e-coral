import { Router } from "express";
import { Newsletter } from "../models/Newsletter.js";

export const newsletterRouter = Router();

newsletterRouter.post("/subscribe", async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email?.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await Newsletter.findOne({ email: normalizedEmail });
    
    if (existing) {
      if (existing.active) {
        res.status(200).json({ message: "Email is already subscribed" });
        return;
      } else {
        // Reactivate subscription
        existing.active = true;
        existing.subscribedAt = new Date();
        await existing.save();
        res.status(200).json({ message: "Successfully resubscribed to newsletter" });
        return;
      }
    }

    await Newsletter.create({
      email: normalizedEmail,
      subscribedAt: new Date(),
      active: true,
    });

    res.status(201).json({ message: "Successfully subscribed to newsletter" });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({ error: "Failed to subscribe. Please try again later." });
  }
});
