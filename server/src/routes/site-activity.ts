import { Router } from "express";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { recordSiteActivitySnapshot } from "../lib/site-activity-record.js";

export const siteActivityRouter = Router();

siteActivityRouter.post("/ping", optionalAuth, (req, res) => {
  recordSiteActivitySnapshot(req as AuthRequest, "ping");
  res.status(204).end();
});
