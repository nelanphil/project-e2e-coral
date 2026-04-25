import compression from "compression";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { categoriesRouter } from "./routes/categories.js";
import { collectionsRouter } from "./routes/collections.js";
import { cartRouter } from "./routes/cart.js";
import { ordersRouter } from "./routes/orders.js";
import { checkoutRouter } from "./routes/checkout.js";
import { handleStripeWebhook, webhooksRouter } from "./routes/webhooks.js";
import { newsletterRouter } from "./routes/newsletter.js";
import { uploadRouter } from "./routes/upload.js";
import { rewardsRouter } from "./routes/rewards.js";
import { pagesRouter } from "./routes/pages.js";
import { contactRouter } from "./routes/contact.js";
import { discountsRouter } from "./routes/discounts.js";
import { tickerRouter } from "./routes/ticker.js";

const app = express();

app.use(compression());

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:3003")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // allow server-to-server (no origin) and any listed origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin ?? true);
      } else {
        // Reject without throwing: cors will respond without
        // Access-Control-Allow-Origin headers and the browser will block,
        // but the server returns a clean response instead of a 500.
        console.warn(`CORS: origin ${origin} not in allow-list`);
        callback(null, false);
      }
    },
    credentials: true,
  }),
);

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/rewards", rewardsRouter);
app.use("/api/discounts", discountsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/contact", contactRouter);
app.use("/api/ticker-items", tickerRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

export default app;
