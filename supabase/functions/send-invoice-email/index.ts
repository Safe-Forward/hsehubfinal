// @ts-nocheck - Deno Edge Function with URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£",
};

function fmt(amount: number, currency = "EUR") {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return `${sym}${Number(amount).toFixed(2)}`;
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    paid: "#059669",
    pending: "#d97706",
    overdue: "#dc2626",
    cancelled: "#6b7280",
    draft: "#2563eb",
  };
  return map[status] ?? "#6b7280";
}

function buildEmailHtml(invoice: any, companyName: string, recipientName: string) {
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency + " ";
  const lineItems = Array.isArray(invoice.line_items) && invoice.line_items.length > 0
    ? invoice.line_items
    : [{ description: "HSE Management Platform – Monthly Subscription", quantity: 1, unit_price: invoice.subtotal, total: invoice.subtotal }];

  const lineItemRows = lineItems.map((item: any) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;font-size:14px;color:#374151;">${item.description}</td>
      <td style="padding:10px 12px;font-size:14px;color:#374151;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;font-size:14px;color:#374151;text-align:right;">${sym}${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding:10px 12px;font-size:14px;color:#374151;text-align:right;font-weight:600;">${sym}${Number(item.total).toFixed(2)}</td>
    </tr>
  `).join("");

  const billingPeriod = invoice.billing_period_start && invoice.billing_period_end
    ? `${fmtDate(invoice.billing_period_start)} – ${fmtDate(invoice.billing_period_end)}`
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Invoice ${invoice.invoice_number}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#1d4ed8 100%);padding:32px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">HSE Safety Hub</div>
              <div style="color:#bfdbfe;font-size:13px;margin-top:4px;">Health, Safety &amp; Environment Management</div>
            </td>
            <td align="right">
              <div style="color:#ffffff;font-size:22px;font-weight:700;">INVOICE</div>
              <div style="color:#93c5fd;font-size:13px;margin-top:4px;">${invoice.invoice_number}</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Status Banner -->
      <tr><td style="background:#eff6ff;padding:14px 40px;border-bottom:1px solid #dbeafe;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:13px;color:#6b7280;">Issued to: <strong style="color:#111827;">${companyName}</strong></td>
          <td align="right">
            <span style="background:${statusColor(invoice.status)}22;color:${statusColor(invoice.status)};border:1px solid ${statusColor(invoice.status)}44;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${invoice.status}</span>
          </td>
        </tr></table>
      </td></tr>

      <!-- Meta info -->
      <tr><td style="padding:28px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="vertical-align:top;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;margin-bottom:4px;">Invoice Date</div>
              <div style="font-size:14px;color:#111827;font-weight:600;">${fmtDate(invoice.created_at)}</div>
            </td>
            ${invoice.due_date ? `<td width="33%" style="vertical-align:top;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;margin-bottom:4px;">Due Date</div>
              <div style="font-size:14px;color:#111827;font-weight:600;">${fmtDate(invoice.due_date)}</div>
            </td>` : "<td></td>"}
            ${billingPeriod ? `<td width="33%" style="vertical-align:top;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;margin-bottom:4px;">Billing Period</div>
              <div style="font-size:14px;color:#111827;font-weight:600;">${billingPeriod}</div>
            </td>` : "<td></td>"}
          </tr>
        </table>
      </td></tr>

      <!-- Line Items Table -->
      <tr><td style="padding:24px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;text-align:left;font-weight:600;">Description</th>
            <th style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;text-align:center;font-weight:600;">Qty</th>
            <th style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;text-align:right;font-weight:600;">Unit Price</th>
            <th style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;text-align:right;font-weight:600;">Total</th>
          </tr>
          ${lineItemRows}
        </table>
      </td></tr>

      <!-- Totals -->
      <tr><td style="padding:16px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="60%"></td>
            <td width="40%">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#6b7280;">Subtotal</td>
                  <td style="padding:5px 0;font-size:13px;color:#374151;text-align:right;">${sym}${Number(invoice.subtotal).toFixed(2)}</td>
                </tr>
                ${Number(invoice.tax_amount) > 0 ? `<tr>
                  <td style="padding:5px 0;font-size:13px;color:#6b7280;">Tax</td>
                  <td style="padding:5px 0;font-size:13px;color:#374151;text-align:right;">${sym}${Number(invoice.tax_amount).toFixed(2)}</td>
                </tr>` : ""}
                <tr><td colspan="2"><hr style="border:none;border-top:2px solid #e5e7eb;margin:8px 0;"></td></tr>
                <tr>
                  <td style="padding:5px 0;font-size:16px;font-weight:700;color:#111827;">Total</td>
                  <td style="padding:5px 0;font-size:16px;font-weight:700;color:#1d4ed8;text-align:right;">${fmt(invoice.total, invoice.currency)}</td>
                </tr>
                ${invoice.status === "paid" ? `<tr>
                  <td colspan="2" style="padding-top:8px;">
                    <div style="background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;text-align:center;">
                      ✓ Payment received ${invoice.paid_at ? "on " + fmtDate(invoice.paid_at) : ""}
                    </div>
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>
        </table>
      </td></tr>

      ${invoice.notes ? `<!-- Notes -->
      <tr><td style="padding:20px 40px 0;">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
          <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:4px;">NOTE</div>
          <div style="font-size:13px;color:#78350f;">${invoice.notes}</div>
        </div>
      </td></tr>` : ""}

      <!-- CTA for pending invoices -->
      ${invoice.status === "pending" || invoice.status === "overdue" ? `<tr><td style="padding:24px 40px 0;text-align:center;">
        <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">Please log in to your account to complete your payment.</div>
        <a href="${Deno.env.get("SITE_URL") ?? ""}/invoices" style="background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">View &amp; Pay Invoice</a>
      </td></tr>` : ""}

      <!-- Footer -->
      <tr><td style="padding:32px 40px;margin-top:20px;">
        <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#9ca3af;">
              <strong style="color:#374151;">HSE Safety Hub</strong><br>
              Health, Safety &amp; Environment Management Platform<br>
              This is an automated invoice email.
            </td>
            <td align="right" style="font-size:12px;color:#9ca3af;">
              Invoice #${invoice.invoice_number}<br>
              Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </td>
          </tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const body = await req.json();
    const { invoice_id, recipient_email, recipient_name } = body;

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Load invoice + company
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ohne diese Prüfung konnte jeder eingeloggte User die Rechnung JEDER
    // Firma per invoice_id abrufen und an eine beliebige recipient_email senden.
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", invoice.company_id)
      .in("role", ["company_admin", "super_admin"])
      .limit(1)
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: requires company admin for this invoice's company" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("name, email, billing_email")
      .eq("id", invoice.company_id)
      .single();

    const toEmail: string = recipient_email ?? company?.billing_email ?? company?.email ?? "";
    const toName: string = recipient_name ?? company?.name ?? "Client";
    const companyName: string = company?.name ?? "Company";

    if (!toEmail) {
      return new Response(JSON.stringify({ error: "No recipient email found. Please provide recipient_email or set billing_email on the company." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: "BREVO_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlContent = buildEmailHtml(invoice, companyName, toName);

    // 4. Send via Brevo
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "HSE Safety Hub", email: "freelancecomm9@gmail.com" },
        to: [{ email: toEmail, name: toName }],
        subject: `Invoice ${invoice.invoice_number} from HSE Safety Hub – ${
          invoice.status === "paid" ? "Payment Received" : "Payment Due"
        }`,
        htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Brevo error:", data);
      return new Response(JSON.stringify({ error: "Failed to send email", details: data }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Log the send event in invoice metadata
    await supabase.from("invoices").update({
      metadata: {
        ...(invoice.metadata ?? {}),
        last_sent_at: new Date().toISOString(),
        last_sent_to: toEmail,
        sent_count: ((invoice.metadata as any)?.sent_count ?? 0) + 1,
      },
    }).eq("id", invoice_id);

    await supabase.rpc("create_audit_log", {
      p_action_type: "send_invoice",
      p_target_type: "invoice",
      p_target_id: invoice.id,
      p_target_name: invoice.invoice_number,
      p_details: {
        recipient_email: toEmail,
        recipient_name: toName,
        sent_via: "brevo",
        status: invoice.status,
      },
      p_company_id: invoice.company_id,
    });

    return new Response(JSON.stringify({ success: true, sent_to: toEmail }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-invoice-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
