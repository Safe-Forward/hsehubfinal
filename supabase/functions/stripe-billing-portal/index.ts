import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function resolveUserCompanyId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("company_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.find((row) => row?.company_id)?.company_id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth – verify JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load company using the same resilient lookup as the auth context
    const companyId = await resolveUserCompanyId(supabase, user.id);
    if (!companyId) {
      return new Response(JSON.stringify({ error: "No company found for this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id, name, billing_email, email")
      .eq("id", companyId)
      .single();

    // 3. Check Stripe key availability – return friendly 503 if not configured
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "stripe_not_configured",
          message: "Stripe payment processing is not yet configured. Please contact your administrator to set up billing.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse return URL from body
    const body = await req.json().catch(() => ({}));
    const returnUrl: string = body.return_url ?? `${Deno.env.get("SITE_URL") ?? ""}/invoices`;

    let customerId: string = company?.stripe_customer_id ?? "";

    // Auto-create Stripe customer if not present
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company?.billing_email ?? company?.email ?? user.email,
        name: company?.name ?? "Company",
        metadata: { company_id: companyId },
      });
      customerId = customer.id;
      // Persist Stripe customer ID back to DB
      await supabase.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId);
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    await supabase.rpc("create_audit_log", {
      p_action_type: "view",
      p_target_type: "billing_portal",
      p_target_id: companyId,
      p_target_name: `${company?.name ?? "Company"} billing portal`,
      p_details: {
        action: "open_billing_portal",
        return_url: returnUrl,
        stripe_customer_id: customerId,
      },
      p_company_id: companyId,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("stripe-billing-portal error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
