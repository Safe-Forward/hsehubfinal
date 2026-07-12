// @ts-nocheck - Deno Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    // Day-5 warning window: trial ends 36–60 h from now
    const warnFrom = new Date(now.getTime() + 36 * 3600_000).toISOString();
    const warnTo   = new Date(now.getTime() + 60 * 3600_000).toISOString();

    // Expired window: trial ended within last 48 h
    const expFrom  = new Date(now.getTime() - 48 * 3600_000).toISOString();

    const [{ data: warnCompanies }, { data: expCompanies }] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, email, billing_email")
        .eq("subscription_status", "trial")
        .gte("trial_ends_at", warnFrom)
        .lte("trial_ends_at", warnTo)
        .eq("is_blocked", false),
      supabase
        .from("companies")
        .select("id, name, email, billing_email")
        .eq("subscription_status", "trial")
        .gte("trial_ends_at", expFrom)
        .lte("trial_ends_at", now.toISOString())
        .eq("is_blocked", false),
    ]);

    const allIds = [
      ...(warnCompanies ?? []).map((c) => c.id),
      ...(expCompanies  ?? []).map((c) => c.id),
    ];

    const { data: alreadySent } = allIds.length > 0
      ? await supabase.from("trial_email_log").select("company_id, email_type").in("company_id", allIds)
      : { data: [] };

    const sent = new Set((alreadySent ?? []).map((r) => `${r.company_id}:${r.email_type}`));

    const results = { warning: 0, expired: 0, skipped: 0, errors: 0 };

    for (const c of (warnCompanies ?? [])) {
      if (sent.has(`${c.id}:day5_warning`)) { results.skipped++; continue; }
      const to = c.billing_email || c.email;
      if (!to) { results.skipped++; continue; }
      if (await sendEmail(to, c.name, "warning")) {
        await supabase.from("trial_email_log").insert({ company_id: c.id, email_type: "day5_warning" });
        results.warning++;
      } else results.errors++;
    }

    for (const c of (expCompanies ?? [])) {
      if (sent.has(`${c.id}:expired`)) { results.skipped++; continue; }
      const to = c.billing_email || c.email;
      if (!to) { results.skipped++; continue; }
      if (await sendEmail(to, c.name, "expired")) {
        await supabase.from("trial_email_log").insert({ company_id: c.id, email_type: "expired" });
        results.expired++;
      } else results.errors++;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});

async function sendEmail(to: string, name: string, type: "warning" | "expired"): Promise<boolean> {
  if (!BREVO_API_KEY) return false;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: "Safe Forward", email: "freelancecomm9@gmail.com" },
      to: [{ email: to, name }],
      subject: type === "warning"
        ? "Ihr Safe Forward Test-Zugang läuft in 2 Tagen ab"
        : "Ihr Safe Forward Test-Zugang ist abgelaufen",
      htmlContent: type === "warning" ? warningHtml(name) : expiredHtml(name),
    }),
  });
  if (!res.ok) console.error("Brevo error:", await res.text());
  return res.ok;
}

function base(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
.wrap{background:#fff;border-radius:8px;padding:40px;box-shadow:0 2px 4px rgba(0,0,0,.1)}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:14px;font-weight:600;margin-bottom:20px}
h1{color:#111827;margin-bottom:16px}
.cta{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;margin:24px 0;font-weight:600;font-size:16px}
.box{background:#F9FAFB;border-left:4px solid #2563eb;border-radius:4px;padding:16px 20px;margin:20px 0}
.foot{margin-top:40px;padding-top:20px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280}
</style></head><body><div class="wrap">${content}
<div class="foot"><p>Safe Forward GmbH · info@safe-forward.de · <a href="https://www.safe-forward.de">safe-forward.de</a></p></div>
</div></body></html>`;
}

function warningHtml(name: string) {
  return base(`
<div class="badge" style="background:#FEF3C7;color:#92400E">⏰ Noch 2 Tage</div>
<h1>Ihr Test-Zugang läuft bald ab</h1>
<p>Hallo ${name},</p>
<p>Ihr kostenloser 7-Tage-Test-Zugang zu <strong>Safe Forward</strong> läuft in <strong>2 Tagen</strong> ab.</p>
<div class="box"><strong>Ihre Daten bleiben erhalten</strong> — alle Mitarbeiter, Dokumente und Einstellungen stehen Ihnen nach dem Upgrade sofort weiter zur Verfügung.</div>
<a href="https://www.safe-forward.de/invoices" class="cta">Jetzt Tarif wählen →</a>
<p>Tarife ab <strong>149 € / Monat</strong> · monatlich kündbar · kein Vertrag.</p>
<p>Herzliche Grüße,<br>Das Safe Forward Team</p>`);
}

function expiredHtml(name: string) {
  return base(`
<div class="badge" style="background:#FEE2E2;color:#991B1B">Testphase abgelaufen</div>
<h1>Ihr Safe Forward Zugang wurde pausiert</h1>
<p>Hallo ${name},</p>
<p>Ihr 7-tägiger Test-Zugang zu <strong>Safe Forward</strong> ist abgelaufen. Um weiterhin auf Ihre Daten zuzugreifen, wählen Sie bitte einen Tarif.</p>
<div class="box"><strong>Ihre Daten sind sicher</strong> — alle Mitarbeiter, Dokumente und Einstellungen bleiben 30 Tage gespeichert und stehen Ihnen nach dem Upgrade sofort wieder zur Verfügung.</div>
<a href="https://www.safe-forward.de/invoices" class="cta">Jetzt freischalten →</a>
<p>Tarife ab <strong>149 € / Monat</strong> · monatlich kündbar · keine versteckten Kosten.</p>
<p>Bei Fragen antworten Sie einfach auf diese E-Mail — wir helfen Ihnen gerne.</p>
<p>Herzliche Grüße,<br>Das Safe Forward Team</p>`);
}
