import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Order } from "../models/Order.js";

const user = process.env.CF_CORALS_EMAIL_USER;
const pass = process.env.CF_CORALS_EMAIL_PASSWORD;
const host = process.env.CF_CORALS_EMAIL_HOST;
const port = Number(process.env.CF_CORALS_EMAIL_PORT) || 465;

function getTransport(): Transporter | null {
  if (!user || !pass || !host) {
    return null;
  }
  const portNum = Number.isNaN(port) ? 465 : port;
  return nodemailer.createTransport({
    host,
    port: portNum,
    secure: portNum === 465,
    auth: { user, pass },
  });
}

type PopulatedLineItem = {
  product: { _id: unknown; name?: string } | null;
  quantity: number;
  price: number;
};

type PopulatedOrder = {
  _id: unknown;
  orderNumber?: string;
  email?: string;
  user?: {
    _id: unknown;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  lineItems: PopulatedLineItem[];
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  taxAmount?: number;
  shippingAmount?: number;
  pointsDiscountCents?: number;
  discountAmountCents?: number;
  discountCode?: string;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildOrderConfirmationHtml(order: PopulatedOrder): string {
  const subtotalCents = order.lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0,
  );
  const shippingCents = order.shippingAmount ?? 0;
  const taxCents = order.taxAmount ?? 0;
  const pointsDiscountCents = order.pointsDiscountCents ?? 0;
  const discountCents = order.discountAmountCents ?? 0;
  const totalCents =
    subtotalCents +
    shippingCents +
    taxCents -
    pointsDiscountCents -
    discountCents;

  const rows = order.lineItems
    .map((li) => {
      const name = li.product?.name ?? "Item";
      const lineTotal = li.price * li.quantity;
      return `<tr><td>${escapeHtml(name)}</td><td>${li.quantity}</td><td>${formatCents(li.price)}</td><td>${formatCents(lineTotal)}</td></tr>`;
    })
    .join("");

  const discountRow =
    discountCents > 0 && order.discountCode
      ? `<tr><td colspan="3">Discount (${escapeHtml(order.discountCode)})</td><td>-${formatCents(discountCents)}</td></tr>`
      : "";
  const pointsRow =
    pointsDiscountCents > 0
      ? `<tr><td colspan="3">Rewards points</td><td>-${formatCents(pointsDiscountCents)}</td></tr>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmation</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="font-size: 1.25rem;">Thank you for your order!</h1>
  <p>We've received your payment and are preparing your order.</p>
  <p><strong>Order number:</strong> #${escapeHtml(String(order.orderNumber ?? order._id))}</p>
  <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
    <thead>
      <tr style="border-bottom: 2px solid #333;">
        <th style="text-align: left; padding: 8px;">Item</th>
        <th style="text-align: right; padding: 8px;">Qty</th>
        <th style="text-align: right; padding: 8px;">Unit</th>
        <th style="text-align: right; padding: 8px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr><td colspan="3" style="padding: 8px;">Subtotal</td><td style="text-align: right; padding: 8px;">${formatCents(subtotalCents)}</td></tr>
      ${taxCents > 0 ? `<tr><td colspan="3" style="padding: 8px;">Tax</td><td style="text-align: right; padding: 8px;">${formatCents(taxCents)}</td></tr>` : ""}
      ${shippingCents > 0 ? `<tr><td colspan="3" style="padding: 8px;">Shipping</td><td style="text-align: right; padding: 8px;">${formatCents(shippingCents)}</td></tr>` : ""}
      ${discountRow}
      ${pointsRow}
      <tr style="font-weight: bold; border-top: 2px solid #333;">
        <td colspan="3" style="padding: 8px;">Total</td>
        <td style="text-align: right; padding: 8px;">${formatCents(totalCents)}</td>
      </tr>
    </tbody>
  </table>
  <p style="margin-top: 1.5rem; color: #666;">Shipping to: ${escapeHtml(order.shippingAddress.line1)}${order.shippingAddress.line2 ? ", " + escapeHtml(order.shippingAddress.line2) : ""}, ${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.state)} ${escapeHtml(order.shippingAddress.postalCode)}, ${escapeHtml(order.shippingAddress.country)}</p>
  <p style="margin-top: 1.5rem;">If you have any questions, please reply to this email.</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends an order confirmation email to the customer after a successful purchase.
 * Uses CF_CORALS_EMAIL_* env vars. No-op if config is missing or order has no recipient.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const transporter = getTransport();
  if (!transporter) {
    console.warn(
      "Order confirmation email skipped: CF_CORALS_EMAIL_USER, CF_CORALS_EMAIL_PASSWORD, or CF_CORALS_EMAIL_HOST not set",
    );
    return;
  }

  const order = (await Order.findById(orderId)
    .populate("lineItems.product", "name")
    .populate("user", "email firstName lastName")
    .lean()) as PopulatedOrder | null;

  if (!order) {
    console.warn(
      `Order confirmation email skipped: order ${orderId} not found`,
    );
    return;
  }

  const recipient =
    order.email?.trim() ||
    (order.user && typeof order.user === "object" && order.user.email
      ? order.user.email.trim()
      : "");
  if (!recipient) {
    console.warn(
      `Order confirmation email skipped: no email for order ${orderId}`,
    );
    return;
  }

  const orderNumber = order.orderNumber ?? String(order._id);
  const subject = `Order Confirmation – #${orderNumber}`;
  const html = buildOrderConfirmationHtml(order);

  await transporter.sendMail({
    from: user,
    to: recipient,
    subject,
    html,
  });
  console.log(
    `Order confirmation email sent to ${recipient} for order #${orderNumber}`,
  );
}

/**
 * Sends an admin alert email to CONFIRM_ORDER_EMAIL_TO when a new order is paid.
 * Uses CF_CORALS_EMAIL_* env vars. No-op if CONFIRM_ORDER_EMAIL_TO or transport is not configured.
 */
export async function sendOrderAlertToAdmin(orderId: string): Promise<void> {
  const adminTo = process.env.CONFIRM_ORDER_EMAIL_TO?.trim();
  if (!adminTo) {
    console.warn("Admin order alert skipped: CONFIRM_ORDER_EMAIL_TO not set");
    return;
  }

  const transporter = getTransport();
  if (!transporter) {
    console.warn(
      "Admin order alert skipped: CF_CORALS_EMAIL_USER, CF_CORALS_EMAIL_PASSWORD, or CF_CORALS_EMAIL_HOST not set",
    );
    return;
  }

  const order = (await Order.findById(orderId)
    .populate("lineItems.product", "name")
    .populate("user", "email firstName lastName")
    .lean()) as PopulatedOrder | null;

  if (!order) {
    console.warn(`Admin order alert skipped: order ${orderId} not found`);
    return;
  }

  const orderNumber = order.orderNumber ?? String(order._id);
  const subject = `New order paid – #${orderNumber}`;
  const baseHtml = buildOrderConfirmationHtml(order);
  const adminHtml = baseHtml
    .replace(
      /<h1[^>]*>.*?<\/h1>/,
      '<h1 style="font-size: 1.25rem; color: #2563eb;">New order received (payment confirmed)</h1>',
    )
    .replace(
      /<p>We've received your payment and are preparing your order\.<\/p>/,
      "<p>A new order has been paid and requires processing.</p>",
    );

  const recipients = adminTo
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  await transporter.sendMail({
    from: user,
    to: recipients,
    subject,
    html: adminHtml,
  });
  console.log(
    `Admin order alert sent to ${recipients.join(", ")} for order #${orderNumber}`,
  );
}

/**
 * Sends a temporary-password email to a newly created user.
 * Returns true if the email was sent, false if transport is not configured.
 */
export async function sendTemporaryPasswordEmail(
  email: string,
  name: string,
  temporaryPassword: string,
): Promise<boolean> {
  const transporter = getTransport();
  if (!transporter) {
    console.warn(
      "Temporary password email skipped: email transport not configured",
    );
    return false;
  }

  const clientUrl = (process.env.CLIENT_ORIGIN ?? "http://localhost:3003").replace(
    /\/$/,
    "",
  );
  const loginUrl = `${clientUrl}/auth/login`;
  const displayName = name || "there";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Account Has Been Created</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="font-size: 1.25rem;">Welcome to CF Corals!</h1>
  <p>Hi ${escapeHtml(displayName)},</p>
  <p>An account has been created for you. You can log in using the temporary password below:</p>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 1rem 0; text-align: center;">
    <p style="margin: 0 0 4px 0; font-size: 0.875rem; color: #666;">Your temporary password</p>
    <p style="margin: 0; font-size: 1.125rem; font-weight: bold; letter-spacing: 0.5px; font-family: monospace;">${escapeHtml(temporaryPassword)}</p>
  </div>
  <p>Please log in and change your password as soon as possible.</p>
  <p style="margin-top: 1.5rem;">
    <a href="${escapeHtml(loginUrl)}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Log In</a>
  </p>
  <p style="margin-top: 1.5rem; color: #666; font-size: 0.875rem;">If you did not expect this email, you can safely ignore it.</p>
</body>
</html>`;

  await transporter.sendMail({
    from: user,
    to: email,
    subject: "Your account has been created",
    html,
  });
  console.log(`Temporary password email sent to ${email}`);
  return true;
}

/**
 * Sends order confirmation + admin alert exactly once per order.
 * Uses atomic update to prevent duplicates when both webhook and confirmation endpoint run.
 * Call this whenever an order transitions to paid (webhook or verifyStripePayment).
 */
export async function sendOrderEmailsOnce(orderId: string): Promise<void> {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, confirmationEmailsSentAt: { $exists: false } },
    { $set: { confirmationEmailsSentAt: new Date() } },
  );
  if (!claimed) {
    return; // Already sent by webhook or confirmation endpoint
  }
  await sendOrderConfirmation(orderId);
  await sendOrderAlertToAdmin(orderId);
}
