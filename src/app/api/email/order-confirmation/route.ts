import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Server-side only — these never reach the browser.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MERCHANT_EMAIL =
  process.env.MERCHANT_EMAIL || "orders@biltongandbytes.co.za";
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// Order shape we accept from the client. Mirrors OrderData in src/lib/supabase.ts
interface EmailOrder {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  items: { name: string; flavor: string; price: number; qty: number }[];
  items_summary: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_mode: string;
  delivery_address: string | null;
  payment_method: string;
  payment_status: string;
  order_status: string;
}

// Resend gracefully degrades: if no API key is set, we return success and skip
// sending. This means the order flow is never broken by a missing env var.
const HAS_RESEND = !!RESEND_API_KEY;
const resend = HAS_RESEND ? new Resend(RESEND_API_KEY) : null;

// ---------------------------------------------------------------------------
// Format currency like the rest of the site: R100, R40, R550
// ---------------------------------------------------------------------------
function rand(n: number): string {
  return `R${n.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Human-readable delivery mode label
// ---------------------------------------------------------------------------
function deliveryLabel(mode: string): string {
  switch (mode) {
    case "stanger":
      return "Stanger Delivery (R40)";
    case "nationwide":
      return "Nationwide Delivery (R150)";
    case "deliver":
      return "Delivery";
    case "collect":
      return "Collection in Stanger (free)";
    default:
      return mode;
  }
}

// ---------------------------------------------------------------------------
// Payment status badge text
// ---------------------------------------------------------------------------
function paymentLabel(method: string, status: string): string {
  if (method === "ikhokha") {
    if (status === "paid") return "Paid via iKhokha ✅";
    if (status === "pending") return "iKhokha — awaiting payment ⏳";
    if (status === "failed") return "iKhokha — payment failed ❌";
    return `iKhokha (${status})`;
  }
  return "Cash / Card on Collection";
}

// ---------------------------------------------------------------------------
// Shared HTML wrapper with Biltong & Bytes branding
// Matches the site palette: dark brown background, gold accents, cream text
// ---------------------------------------------------------------------------
function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0A0301;font-family:Georgia,'Times New Roman',serif;color:#FEF3DF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0301;min-height:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#1A0A04;border:1px solid rgba(229,184,60,0.25);border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid rgba(229,184,60,0.2);text-align:center;">
              <p style="margin:0;font-size:22px;letter-spacing:0.2em;color:#E5B83C;font-weight:bold;">
                🥩 BILTONG <span style="color:#E07A2C;">&amp;</span> BYTES
              </p>
              <p style="margin:4px 0 0 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(254,243,223,0.45);">
                Premium Halaal Biltong · Stanger, KZN
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(229,184,60,0.15);text-align:center;">
              <p style="margin:0;font-size:11px;color:rgba(254,243,223,0.4);line-height:1.6;">
                biltongandbytes.co.za · Stanger, KwaZulu-Natal<br/>
                100% Halaal Certified · Made fresh to order
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Order summary table — shared between both emails
// ---------------------------------------------------------------------------
function orderTableHtml(order: EmailOrder): string {
  const rows = order.items
    .map((item) => {
      const flavorStr = item.flavor ? ` · ${item.flavor}` : "";
      const lineTotal = item.price * item.qty;
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(254,243,223,0.08);font-size:14px;color:#FEF3DF;">
          <strong style="color:#E5B83C;">${item.qty}×</strong> ${item.name}${flavorStr}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid rgba(254,243,223,0.08);font-size:14px;color:#FEF3DF;white-space:nowrap;">
          ${rand(lineTotal)}
        </td>
      </tr>`;
    })
    .join("");

  const deliveryRow =
    order.delivery_fee > 0
      ? `<tr>
        <td style="padding:8px 0;font-size:13px;color:rgba(254,243,223,0.7);">Delivery</td>
        <td align="right" style="padding:8px 0;font-size:13px;color:rgba(254,243,223,0.7);white-space:nowrap;">${rand(order.delivery_fee)}</td>
      </tr>`
      : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    ${rows}
    ${deliveryRow}
    <tr>
      <td style="padding:14px 0 4px 0;border-top:2px solid #E5B83C;font-size:16px;font-weight:bold;color:#E5B83C;">TOTAL</td>
      <td align="right" style="padding:14px 0 4px 0;border-top:2px solid #E5B83C;font-size:18px;font-weight:bold;color:#E5B83C;white-space:nowrap;">${rand(order.total)}</td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// CUSTOMER EMAIL — order confirmation
// ---------------------------------------------------------------------------
function customerEmailHtml(order: EmailOrder): string {
  const isPaid = order.payment_status === "paid";
  const heading = isPaid ? "Payment Approved!" : "Order Received!";
  const intro = isPaid
    ? `Your payment has been confirmed and your order is now being prepared. We make every batch fresh — please allow <strong>3 days</strong> for preparation before collection or delivery.`
    : `We've received your order. Pay cash or card when you collect in Stanger. Please allow <strong>3 days</strong> for preparation — our biltong is made fresh to order.`;

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:26px;color:#E5B83C;font-weight:normal;">${heading}</h1>
    <p style="margin:0 0 20px 0;font-size:14px;color:rgba(254,243,223,0.75);line-height:1.6;">Hi ${order.customer_name},</p>
    <p style="margin:0 0 24px 0;font-size:14px;color:rgba(254,243,223,0.85);line-height:1.6;">${intro}</p>

    <!-- Order ref card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:rgba(46,125,50,0.12);border:1px solid #2E7D32;border-radius:12px;">
      <tr>
        <td align="center" style="padding:16px;">
          <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(254,243,223,0.6);">Order Reference</p>
          <p style="margin:4px 0 0 0;font-size:22px;font-weight:bold;letter-spacing:0.1em;color:#2E7D32;">${order.order_id}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(254,243,223,0.55);">Order Summary</p>
    ${orderTableHtml(order)}

    <!-- Details block -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(229,184,60,0.06);border-radius:12px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px 0;font-size:13px;"><strong style="color:#E5B83C;">Delivery:</strong> <span style="color:rgba(254,243,223,0.85);">${deliveryLabel(order.delivery_mode)}</span></p>
        ${order.delivery_address ? `<p style="margin:0 0 8px 0;font-size:13px;"><strong style="color:#E5B83C;">Address:</strong> <span style="color:rgba(254,243,223,0.85);">${order.delivery_address}</span></p>` : ""}
        <p style="margin:0 0 8px 0;font-size:13px;"><strong style="color:#E5B83C;">Phone:</strong> <span style="color:rgba(254,243,223,0.85);">${order.customer_phone}</span></p>
        <p style="margin:0;font-size:13px;"><strong style="color:#E5B83C;">Payment:</strong> <span style="color:rgba(254,243,223,0.85);">${paymentLabel(order.payment_method, order.payment_status)}</span></p>
      </td></tr>
    </table>

    <p style="margin:24px 0 0 0;font-size:12px;color:rgba(254,243,223,0.55);line-height:1.6;text-align:center;">
      Questions? Reply to this email or visit<br/>
      <a href="https://biltongandbytes.co.za" style="color:#E5B83C;text-decoration:none;">biltongandbytes.co.za</a>
    </p>
  `;

  return emailShell(`Biltong & Bytes — Order ${order.order_id}`, body);
}

// ---------------------------------------------------------------------------
// MERCHANT EMAIL — new order alert
// ---------------------------------------------------------------------------
function merchantEmailHtml(order: EmailOrder): string {
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;color:#E5B83C;font-weight:normal;">New Order Received</h1>
    <p style="margin:0 0 20px 0;font-size:13px;color:rgba(254,243,223,0.7);line-height:1.6;">
      A new order has been placed. Details below — also visible in your
      <a href="https://biltongandbytes.co.za/admin" style="color:#E5B83C;text-decoration:none;">admin panel</a>.
    </p>

    <!-- Order ref + status badges -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:rgba(229,184,60,0.1);border:1px solid rgba(229,184,60,0.4);border-radius:12px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 6px 0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(254,243,223,0.6);">Order ID</p>
        <p style="margin:0 0 12px 0;font-size:20px;font-weight:bold;letter-spacing:0.1em;color:#E5B83C;">${order.order_id}</p>
        <p style="margin:0;font-size:13px;">
          <span style="display:inline-block;padding:4px 10px;border-radius:4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;background:rgba(229,184,60,0.18);color:#E5B83C;margin-right:6px;">${paymentLabel(order.payment_method, order.payment_status)}</span>
          <span style="display:inline-block;padding:4px 10px;border-radius:4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;background:rgba(254,243,223,0.08);color:rgba(254,243,223,0.7);">${order.order_status}</span>
        </p>
      </td></tr>
    </table>

    <!-- Customer block -->
    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(254,243,223,0.55);">Customer</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:rgba(254,243,223,0.04);border-radius:12px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 6px 0;font-size:14px;color:#FEF3DF;"><strong style="color:#E5B83C;">Name:</strong> ${order.customer_name}</p>
        <p style="margin:0 0 6px 0;font-size:14px;color:#FEF3DF;"><strong style="color:#E5B83C;">Phone:</strong> ${order.customer_phone}</p>
        ${order.customer_email ? `<p style="margin:0 0 6px 0;font-size:14px;color:#FEF3DF;"><strong style="color:#E5B83C;">Email:</strong> ${order.customer_email}</p>` : ""}
        <p style="margin:0;font-size:14px;color:#FEF3DF;"><strong style="color:#E5B83C;">Delivery:</strong> ${deliveryLabel(order.delivery_mode)}${order.delivery_address ? ` — ${order.delivery_address}` : ""}</p>
      </td></tr>
    </table>

    <!-- Items -->
    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(254,243,223,0.55);">Items</p>
    ${orderTableHtml(order)}

    <p style="margin:24px 0 0 0;font-size:12px;color:rgba(254,243,223,0.55);line-height:1.6;text-align:center;">
      <a href="https://biltongandbytes.co.za/admin" style="color:#E5B83C;text-decoration:none;">View all orders in your admin panel →</a>
    </p>
  `;

  return emailShell(`New Order ${order.order_id}`, body);
}

// ---------------------------------------------------------------------------
// POST /api/email/order-confirmation
// Sends customer + merchant emails. Always returns 200 so the order flow
// is never broken by an email failure — errors are logged server-side.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const order: EmailOrder = await request.json();

    if (!order || !order.order_id) {
      return NextResponse.json(
        { error: "Missing order data" },
        { status: 400 }
      );
    }

    // No API key configured — log and return gracefully
    if (!HAS_RESEND || !resend) {
      console.warn(
        `[Email] RESEND_API_KEY not set — skipping emails for order ${order.order_id}`
      );
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: "RESEND_API_KEY not configured",
      });
    }

    const results: { customer?: unknown; merchant?: unknown } = {};

    // 1. Send customer email — only if customer provided an email
    if (order.customer_email) {
      try {
        const customerRes = await resend.emails.send({
          from: `Biltong & Bytes <${RESEND_FROM_EMAIL}>`,
          to: order.customer_email,
          subject: `Order ${order.order_id} — Biltong & Bytes`,
          html: customerEmailHtml(order),
        });
        results.customer = customerRes;
        console.log(
          `[Email] Customer email sent for ${order.order_id} -> ${order.customer_email}`
        );
      } catch (err) {
        // Expected with onboarding sender when customer email != Resend account email
        console.error(
          `[Email] Customer email failed for ${order.order_id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // 2. Send merchant email — always
    try {
      const merchantRes = await resend.emails.send({
        from: `Biltong & Bytes <${RESEND_FROM_EMAIL}>`,
        to: MERCHANT_EMAIL,
        subject: `New Order ${order.order_id} — ${rand(order.total)}`,
        html: merchantEmailHtml(order),
      });
      results.merchant = merchantRes;
      console.log(
        `[Email] Merchant email sent for ${order.order_id} -> ${MERCHANT_EMAIL}`
      );
    } catch (err) {
      console.error(
        `[Email] Merchant email failed for ${order.order_id}:`,
        err instanceof Error ? err.message : err
      );
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Email API] Error:", error);
    // Always return 200 so client order flow never breaks
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 200 }
    );
  }
}
