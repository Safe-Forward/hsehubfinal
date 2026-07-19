// @ts-nocheck - Deno Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const NOTIFY_EMAIL = "info@safe-forward.de";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_name, company_email, subscription_tier, trial_ends_at, created_at } = await req.json();

    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return new Response(JSON.stringify({ error: "BREVO_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tierLabels: Record<string, string> = {
      basic: "Paket S – HSE Basic (€149/Monat)",
      standard: "Paket M – HSE Pro (€249/Monat)",
      premium: "Paket L – HSE Enterprise (€349/Monat)",
    };

    const tierLabel = tierLabels[subscription_tier] ?? subscription_tier ?? "–";
    const registeredAt = new Date(created_at).toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const trialEnd = trial_ends_at
      ? new Date(trial_ends_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "–";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1C1C1C; max-width: 560px; margin: 0 auto; padding: 24px;">
  <div style="background: #1A3A5C; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px;">🎉 Neue Unternehmensregistrierung</h1>
    <p style="color: #90BCDB; margin: 4px 0 0; font-size: 14px;">HSE Hub – Safe-Forward</p>
  </div>
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #64748B; font-size: 14px; width: 160px;">Unternehmen</td>
        <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${company_name ?? "–"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">E-Mail</td>
        <td style="padding: 8px 0; font-size: 14px;">${company_email ?? "–"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Tarif</td>
        <td style="padding: 8px 0; font-size: 14px;">${tierLabel}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Trial läuft bis</td>
        <td style="padding: 8px 0; font-size: 14px;">${trialEnd}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Registriert am</td>
        <td style="padding: 8px 0; font-size: 14px;">${registeredAt} Uhr</td>
      </tr>
    </table>
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
      <a href="https://app.hsehub.de/super-admin/companies"
         style="background: #1A3A5C; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
        Im SuperAdmin ansehen →
      </a>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "HSE Hub System", email: "noreply@safe-forward.de" },
        to: [{ email: NOTIFY_EMAIL, name: "Safe-Forward Admin" }],
        subject: `🎉 Neue Registrierung: ${company_name ?? "Unbekannt"}`,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Brevo error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
