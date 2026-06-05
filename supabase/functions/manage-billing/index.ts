// @ts-nocheck - Deno Edge Function
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's company
    const companyId = await resolveUserCompanyId(supabase, user.id);

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "No company associated with user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (!company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { action, ...params } = await req.json();

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Handle different actions
    switch (action) {
      case "get_billing_info": {
        // Get current billing information
        const result = {
          company: {
            id: company.id,
            name: company.name,
            subscription_tier: company.subscription_tier,
            subscription_status: company.subscription_status,
            subscription_start_date: company.subscription_start_date,
            subscription_end_date: company.subscription_end_date,
            trial_ends_at: company.trial_ends_at,
            billing_email: company.billing_email,
            subscription_billing_interval: company.subscription_billing_interval,
          },
          stripe: {
            customer_id: company.stripe_customer_id,
            subscription_id: company.stripe_subscription_id,
          },
        };

        // Get invoices
        const { data: invoices } = await supabase
          .from("invoices")
          .select("*")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(10);

        result.invoices = invoices || [];

        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_customer_portal": {
        // Create Stripe customer portal session
        if (!company.stripe_customer_id) {
          return new Response(
            JSON.stringify({ error: "No Stripe customer ID found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: company.stripe_customer_id,
          return_url: params.return_url || `${Deno.env.get("SITE_URL")}/invoices`,
        });

        return new Response(
          JSON.stringify({ url: session.url }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_upcoming_invoice": {
        // Get upcoming invoice from Stripe
        if (!company.stripe_subscription_id) {
          return new Response(
            JSON.stringify({ error: "No active subscription found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        try {
          const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            subscription: company.stripe_subscription_id,
          });

          return new Response(
            JSON.stringify({
              amount_due: upcomingInvoice.amount_due / 100,
              currency: upcomingInvoice.currency,
              period_start: new Date(upcomingInvoice.period_start * 1000).toISOString(),
              period_end: new Date(upcomingInvoice.period_end * 1000).toISOString(),
              line_items: upcomingInvoice.lines.data.map(line => ({
                description: line.description,
                amount: line.amount / 100,
                quantity: line.quantity,
              })),
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "update_billing_email": {
        // Update billing email
        const { billing_email } = params;
        
        if (!billing_email || !billing_email.includes("@")) {
          return new Response(
            JSON.stringify({ error: "Invalid email address" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabase
          .from("companies")
          .update({ billing_email })
          .eq("id", company.id);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update Stripe customer if exists
        if (company.stripe_customer_id) {
          await stripe.customers.update(company.stripe_customer_id, {
            email: billing_email,
          });
        }

        // Log activity
        await supabase.rpc("create_audit_log", {
          p_action_type: "update_billing_email",
          p_target_type: "company",
          p_target_id: company.id,
          p_target_name: company.name,
          p_details: { new_email: billing_email },
          p_company_id: company.id,
        });

        return new Response(
          JSON.stringify({ success: true, billing_email }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancel_subscription": {
        // Cancel subscription at period end
        if (!company.stripe_subscription_id) {
          return new Response(
            JSON.stringify({ error: "No active subscription found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const subscription = await stripe.subscriptions.update(
          company.stripe_subscription_id,
          { cancel_at_period_end: true }
        );

        // Update local database
        await supabase
          .from("companies")
          .update({ 
            subscription_status: "cancelled",
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq("id", company.id);

        // Log activity
        await supabase.rpc("create_audit_log", {
          p_action_type: "cancel_subscription",
          p_target_type: "company",
          p_target_id: company.id,
          p_target_name: company.name,
          p_details: { 
            cancelled_at: new Date().toISOString(),
            ends_at: new Date(subscription.current_period_end * 1000).toISOString()
          },
          p_company_id: company.id,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Subscription will be cancelled at period end",
            ends_at: new Date(subscription.current_period_end * 1000).toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reactivate_subscription": {
        // Reactivate a cancelled subscription
        if (!company.stripe_subscription_id) {
          return new Response(
            JSON.stringify({ error: "No subscription found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const subscription = await stripe.subscriptions.update(
          company.stripe_subscription_id,
          { cancel_at_period_end: false }
        );

        // Update local database
        await supabase
          .from("companies")
          .update({ subscription_status: "active" })
          .eq("id", company.id);

        // Log activity
        await supabase.rpc("create_audit_log", {
          p_action_type: "reactivate_subscription",
          p_target_type: "company",
          p_target_id: company.id,
          p_target_name: company.name,
          p_details: { reactivated_at: new Date().toISOString() },
          p_company_id: company.id,
        });

        return new Response(
          JSON.stringify({ success: true, message: "Subscription reactivated" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("Billing management error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
