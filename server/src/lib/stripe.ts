import Stripe from "stripe";

/**
 * Resolve Stripe credentials based on NODE_ENV.
 *
 * In production we prefer the live keys (STRIPE_PRODUCTION_LIVE_KEY /
 * STRIPE_PRODUCTION_WEBHOOK). Outside production we use the test keys
 * (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET). Each lookup falls back to
 * the other variable if its preferred one is unset, so existing
 * deployments keep working while environment variables are migrated.
 */
const isProduction = process.env.NODE_ENV === "production";

export const stripeSecretKey = isProduction
  ? process.env.STRIPE_PRODUCTION_LIVE_KEY ?? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_PRODUCTION_LIVE_KEY;

export const stripeWebhookSecret = isProduction
  ? process.env.STRIPE_PRODUCTION_WEBHOOK ?? process.env.STRIPE_WEBHOOK_SECRET
  : process.env.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_PRODUCTION_WEBHOOK;

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

if (stripeSecretKey) {
  const mode = stripeSecretKey.startsWith("sk_live_") ? "live" : "test";
  console.log(
    `[stripe] Initialized in ${mode} mode (NODE_ENV=${process.env.NODE_ENV ?? "undefined"})`,
  );
} else {
  console.warn(
    "[stripe] No Stripe secret key configured (STRIPE_PRODUCTION_LIVE_KEY or STRIPE_SECRET_KEY)",
  );
}
