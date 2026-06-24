import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeInterval(interval: string | null | undefined): "monthly" | "yearly" {
  return interval === "yearly" || interval === "year" ? "yearly" : "monthly";
}

// The real price IDs live in subscription_packages (same table stripe-webhook
// reads to resolve tier from price_id), not in edge function secrets - this
// keeps both directions of the integration pointed at one source of truth.
async function getPriceId(
  supabase: ReturnType<typeof createClient>,
  tier: string,
  interval: "monthly" | "yearly"
): Promise<string> {
  const { data } = await supabase
    .from("subscription_packages")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("tier", tier)
    .eq("is_active", true)
    .maybeSingle();

  const fromDb = interval === "yearly" ? data?.stripe_price_id_yearly : data?.stripe_price_id_monthly;
  if (fromDb) return fromDb;

  const upperTier = tier.toUpperCase();
  const intervalSuffix = interval === "yearly" ? "YEARLY" : "MONTHLY";
  const intervalSpecific = Deno.env.get(`STRIPE_PRICE_${upperTier}_${intervalSuffix}`) ?? "";
  const legacy = Deno.env.get(`STRIPE_PRICE_${upperTier}`) ?? "";

  if (intervalSpecific) return intervalSpecific;
  if (interval === "monthly" && legacy) return legacy;
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let errCompanyId: string | null = null;
  let errUserEmail: string | null = null;

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
    errUserEmail = user.email ?? null;

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const tier: string = body.tier ?? "standard";
    const interval = normalizeInterval(body.interval ?? "monthly");
    const siteUrl: string = Deno.env.get("SITE_URL") ?? "";
    const successUrl: string = body.success_url ?? `${siteUrl}/invoices?checkout=success`;
    const cancelUrl: string = body.cancel_url ?? `${siteUrl}/invoices?checkout=cancelled`;

    const priceId = await getPriceId(supabase, tier, interval);
    if (!priceId) {
      return new Response(
        JSON.stringify({
          error:
            interval === "yearly"
              ? `No Stripe yearly price configured for plan: ${tier}. Add STRIPE_PRICE_${tier.toUpperCase()}_YEARLY secret.`
              : `No Stripe monthly price configured for plan: ${tier}. Add STRIPE_PRICE_${tier.toUpperCase()}_MONTHLY (or legacy STRIPE_PRICE_${tier.toUpperCase()}) secret.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Load company
    // user_company_roles does not exist - this always failed before. The
    // correct table (matching manage-billing's resolveUserCompanyId) is
    // user_roles, which can hold multiple rows per user across companies.
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("company_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(10);

    const companyId = (roleRows ?? []).find((row) => row?.company_id)?.company_id ?? null;
    errCompanyId = companyId;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Starting a paid subscription is an admin action, same as manage-billing.
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .in("role", ["company_admin", "super_admin"])
      .limit(1)
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: requires company admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id, name, billing_email, email")
      .eq("id", companyId)
      .single();

    // 4. Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let customerId: string = company?.stripe_customer_id ?? "";

    // Auto-create customer if not present
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company?.billing_email ?? company?.email ?? user.email,
        name: company?.name ?? "Company",
        metadata: { company_id: companyId },
      });
      customerId = customer.id;
      await supabase.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        company_id: companyId,
        plan: tier,
        interval,
      },
      subscription_data: {
        metadata: { company_id: companyId, plan: tier, interval },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    try {
      const logClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await logClient.rpc("create_audit_log", {
        p_action_type: "error",
        p_target_type: "system",
        p_target_id: null,
        p_target_name: "stripe-checkout",
        p_details: {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack?.slice(0, 500) : null,
          actor_email: errUserEmail,
        },
        p_company_id: errCompanyId,
      });
    } catch (logErr) {
      console.error("Failed to log stripe-checkout error:", logErr);
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
