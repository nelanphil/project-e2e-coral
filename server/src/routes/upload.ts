import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export const uploadRouter = Router();

uploadRouter.post(
  "/image",
  requireAdmin,
  upload.single("image"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const result = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed"));
            else resolve(result);
          },
        );
        stream.end(req.file!.buffer);
      });

      const optimizedUrl = result.secure_url.replace(
        "/upload/",
        "/upload/f_auto,q_auto/",
      );

      res.json({ url: optimizedUrl, publicId: result.public_id });
    } catch (err: unknown) {
      console.error("Cloudinary upload error:", err);
      res.status(500).json({ error: (err as Error).message || "Image upload failed" });
    }
  },
);
