// @ts-nocheck - Deno edge function
// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Supabase JS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - Stripe
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

declare const Deno: any;

type PlanTier = "basic" | "standard" | "premium";
type BillingInterval = "month" | "year";

const PAYMENT_LINK_URLS: Record<PlanTier, { monthly: string; yearly: string }> = {
  basic: {
    monthly: Deno.env.get("STRIPE_PAYMENT_LINK_BASIC_MONTHLY_URL") ?? "https://buy.stripe.com/cNi4gy9vEenj9jxgWNeME03",
    yearly: Deno.env.get("STRIPE_PAYMENT_LINK_BASIC_YEARLY_URL") ?? "https://buy.stripe.com/28E14m6jsdjf2V9fSJeME04",
  },
  standard: {
    monthly: Deno.env.get("STRIPE_PAYMENT_LINK_STANDARD_MONTHLY_URL") ?? "https://buy.stripe.com/00w00idLU0wt53hdKBeME05",
    yearly: Deno.env.get("STRIPE_PAYMENT_LINK_STANDARD_YEARLY_URL") ?? "https://buy.stripe.com/14A14m37g2EBeDRdKBeME06",
  },
  premium: {
    monthly: Deno.env.get("STRIPE_PAYMENT_LINK_PREMIUM_MONTHLY_URL") ?? "https://buy.stripe.com/9B628q6js2EB9jxaypeME07",
    yearly: Deno.env.get("STRIPE_PAYMENT_LINK_PREMIUM_YEARLY_URL") ?? "https://buy.stripe.com/cNibJ00Z81AxgLZ0XPeME08",
  },
};

const SUBSCRIPTION_STATUS_MAP: Record<string, "active" | "trial" | "inactive" | "cancelled"> = {
  active: "active",
  trialing: "trial",
  past_due: "inactive",
  canceled: "cancelled",
  unpaid: "inactive",
  incomplete: "inactive",
  incomplete_expired: "inactive",
  paused: "inactive",
};

const VALID_TIERS = new Set<PlanTier>(["basic", "standard", "premium"]);

let cachedPricePlanMap: Record<string, { tier: PlanTier; interval: BillingInterval }> = {};
let cachedAmountPlanMap: Record<string, PlanTier> = {};
let cachedPricePlanMapAt = 0;

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return null;
  return String(value);
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    return url.replace(/\/+$/, "");
  }
}

function normalizeInterval(interval: string | null | undefined): BillingInterval | null {
  if (!interval) return null;
  if (interval === "month" || interval === "monthly") return "month";
  if (interval === "year" || interval === "yearly") return "year";
  return null;
}

function parseTier(value: unknown): PlanTier | null {
  if (typeof value !== "string") return null;
  if (VALID_TIERS.has(value as PlanTier)) return value as PlanTier;
  return null;
}

function resolvePlanFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return { tier: null as PlanTier | null, interval: null as BillingInterval | null };
  return {
    tier: parseTier((metadata.plan as string) ?? (metadata.subscription_tier as string)),
    interval: normalizeInterval(
      (metadata.interval as string) ??
        (metadata.billing_interval as string) ??
        (metadata.subscription_interval as string)
    ),
  };
}

function resolvePlanFromPaymentLinkUrl(url: string | null | undefined) {
  const normalized = normalizeUrl(url);
  if (!normalized) return { tier: null as PlanTier | null, interval: null as BillingInterval | null };

  for (const [tier, links] of Object.entries(PAYMENT_LINK_URLS) as Array<[
    PlanTier,
    { monthly: string; yearly: string }
  ]>) {
    if (normalizeUrl(links.monthly) === normalized) {
      return { tier, interval: "month" as BillingInterval };
    }
    if (normalizeUrl(links.yearly) === normalized) {
      return { tier, interval: "year" as BillingInterval };
    }
  }

  return { tier: null as PlanTier | null, interval: null as BillingInterval | null };
}

async function getPricePlanMap(supabase: any, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && now - cachedPricePlanMapAt < 5 * 60 * 1000 && Object.keys(cachedPricePlanMap).length > 0) {
    return cachedPricePlanMap;
  }

  const { data, error } = await supabase
    .from("subscription_packages")
    .select("tier, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load subscription package price map:", error);
    return cachedPricePlanMap;
  }

  const map: Record<string, { tier: PlanTier; interval: BillingInterval }> = {};
  const amountMap: Record<string, PlanTier> = {};
  for (const row of data ?? []) {
    const tier = parseTier(row.tier);
    if (!tier) continue;
    if (row.stripe_price_id_monthly) {
      map[row.stripe_price_id_monthly] = { tier, interval: "month" };
    }
    if (row.stripe_price_id_yearly) {
      map[row.stripe_price_id_yearly] = { tier, interval: "year" };
    }

    const monthlyAmount = Number(row.price_monthly);
    if (Number.isFinite(monthlyAmount) && monthlyAmount > 0) {
      amountMap[`month:${Math.round(monthlyAmount * 100)}`] = tier;
    }

    const yearlyAmount = Number(row.price_yearly);
    if (Number.isFinite(yearlyAmount) && yearlyAmount > 0) {
      amountMap[`year:${Math.round(yearlyAmount * 100)}`] = tier;
    }
  }

  cachedPricePlanMap = map;
  cachedAmountPlanMap = amountMap;
  cachedPricePlanMapAt = now;
  return map;
}

async function resolvePlanFromAmount(
  unitAmount: number | null | undefined,
  interval: BillingInterval | null,
  supabase: any
) {
  if (!interval || unitAmount === null || unitAmount === undefined) {
    return null;
  }

  await getPricePlanMap(supabase);
  const key = `${interval}:${Math.round(Number(unitAmount))}`;
  return cachedAmountPlanMap[key] ?? null;
}

async function resolvePlanFromPriceId(priceId: string | null | undefined, supabase: any) {
  if (!priceId) return { tier: null as PlanTier | null, interval: null as BillingInterval | null };
  const map = await getPricePlanMap(supabase);
  const match = map[priceId];
  if (match) return match;

  const refreshed = await getPricePlanMap(supabase, true);
  return refreshed[priceId] ?? { tier: null as PlanTier | null, interval: null as BillingInterval | null };
}

async function resolvePlanFromSubscription(sub: Stripe.Subscription, supabase: any) {
  const metadataPlan = resolvePlanFromMetadata(sub.metadata as Record<string, unknown>);
  const firstPrice = sub.items?.data?.[0]?.price;
  const priceId = firstPrice?.id ?? null;
  const mapped = await resolvePlanFromPriceId(priceId, supabase);
  const intervalFromPrice = normalizeInterval(firstPrice?.recurring?.interval ?? null);
  const amountTier = await resolvePlanFromAmount(firstPrice?.unit_amount ?? null, intervalFromPrice, supabase);

  return {
    tier: mapped.tier ?? metadataPlan.tier ?? amountTier,
    interval: mapped.interval ?? metadataPlan.interval ?? intervalFromPrice,
    priceId,
  };
}

async function resolvePlanFromCheckoutSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: any
) {
  const metadataPlan = resolvePlanFromMetadata(session.metadata as Record<string, unknown>);

  let paymentLinkPlan = { tier: null as PlanTier | null, interval: null as BillingInterval | null };
  if (session.payment_link) {
    try {
      const paymentLink = await stripe.paymentLinks.retrieve(toStringOrNull(session.payment_link)!);
      paymentLinkPlan = resolvePlanFromPaymentLinkUrl(paymentLink?.url ?? null);
    } catch (err) {
      console.error("Failed retrieving payment link details:", err);
    }
  }

  let priceId: string | null = null;
  let intervalFromPrice: BillingInterval | null = null;
  let priceUnitAmount: number | null = null;
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
      expand: ["data.price"],
    });
    const first = lineItems.data?.[0];
    priceId = first?.price?.id ?? null;
    intervalFromPrice = normalizeInterval(first?.price?.recurring?.interval ?? null);
    priceUnitAmount = first?.price?.unit_amount ?? null;
  } catch (err) {
    console.error("Failed retrieving checkout line items:", err);
  }

  const mapped = await resolvePlanFromPriceId(priceId, supabase);
  const amountTier = await resolvePlanFromAmount(priceUnitAmount, intervalFromPrice, supabase);

  return {
    tier: mapped.tier ?? paymentLinkPlan.tier ?? metadataPlan.tier ?? amountTier,
    interval: mapped.interval ?? paymentLinkPlan.interval ?? metadataPlan.interval ?? intervalFromPrice,
    priceId,
  };
}

async function findCompanyId(
  supabase: any,
  explicitCompanyId: string | null | undefined,
  customerId: string | null | undefined
) {
  if (explicitCompanyId) return explicitCompanyId;
  if (!customerId) return null;

  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Failed to find company by stripe_customer_id:", error);
    return null;
  }

  return data?.id ?? null;
}

async function updateCompanySubscription(supabase: any, companyId: string, updates: Record<string, unknown>) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("companies").update(payload).eq("id", companyId);
  if (!error) return;

  const message = String(error?.message ?? "").toLowerCase();
  const details = String(error?.details ?? "").toLowerCase();
  const intervalColumnMissing =
    payload.subscription_billing_interval !== undefined &&
    (
      error?.code === "PGRST204" ||
      message.includes("subscription_billing_interval") ||
      details.includes("subscription_billing_interval") ||
      message.includes("column")
    );

  if (intervalColumnMissing) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.subscription_billing_interval;

    const { error: fallbackError } = await supabase
      .from("companies")
      .update(fallbackPayload)
      .eq("id", companyId);

    if (!fallbackError) {
      console.warn("companies.subscription_billing_interval is missing; update applied without interval.");
      return;
    }

    throw fallbackError;
  }

  throw error;
}

function mapSubscriptionStatus(status: string, cancelAtPeriodEnd = false) {
  if (cancelAtPeriodEnd) return "cancelled";
  return SUBSCRIPTION_STATUS_MAP[status] ?? "inactive";
}

async function logBillingEvent(
  supabase: any,
  payload: {
    action: string;
    targetType: string;
    targetId: string | null;
    targetName: string;
    companyId: string | null;
    details: Record<string, unknown>;
  }
) {
  try {
    await supabase.rpc("create_audit_log", {
      p_action_type: payload.action,
      p_target_type: payload.targetType,
      p_target_id: payload.targetId,
      p_target_name: payload.targetName,
      p_details: payload.details,
      p_company_id: payload.companyId,
    });
  } catch (error) {
    console.error("Failed to write billing audit log:", error);
  }
}

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret missing", { status: 500 });
  }

  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    console.error("STRIPE_SECRET_KEY is not configured");
    return new Response("Stripe secret missing", { status: 500 });
  }

  let event: Stripe.Event;
  let stripe: Stripe;

  try {
    const body = await req.text();
    stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook Error", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = toStringOrNull(sub.customer);
        const companyId = await findCompanyId(supabase, sub.metadata?.company_id ?? null, customerId);
        if (!companyId) break;

        const resolved = await resolvePlanFromSubscription(sub, supabase);
        const status = mapSubscriptionStatus(sub.status, Boolean(sub.cancel_at_period_end));

        const updates: Record<string, unknown> = {
          subscription_status: status,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
          subscription_start_date: sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : sub.start_date
              ? new Date(sub.start_date * 1000).toISOString()
              : null,
          subscription_end_date: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        };

        if (resolved.tier) updates.subscription_tier = resolved.tier;
        if (resolved.interval) updates.subscription_billing_interval = resolved.interval;
        if (status === "trial" && sub.trial_end) {
          updates.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
        } else if (status !== "trial") {
          updates.trial_ends_at = null;
        }

        await updateCompanySubscription(supabase, companyId, updates);
        await logBillingEvent(supabase, {
          action: "update_subscription",
          targetType: "subscription",
          targetId: companyId,
          targetName: `${resolved.tier ?? "unknown"} subscription`,
          companyId,
          details: {
            source: "stripe_webhook",
            status,
            subscription_id: sub.id,
            customer_id: customerId,
            plan: resolved.tier,
            interval: resolved.interval,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = toStringOrNull(sub.customer);
        const companyId = await findCompanyId(supabase, sub.metadata?.company_id ?? null, customerId);
        if (!companyId) break;

        await updateCompanySubscription(supabase, companyId, {
          subscription_status: "cancelled",
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          subscription_end_date: sub.canceled_at
            ? new Date(sub.canceled_at * 1000).toISOString()
            : sub.ended_at
              ? new Date(sub.ended_at * 1000).toISOString()
              : sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
        });
        await logBillingEvent(supabase, {
          action: "cancel_subscription",
          targetType: "subscription",
          targetId: companyId,
          targetName: `${sub.id} cancelled`,
          companyId,
          details: {
            source: "stripe_webhook",
            subscription_id: sub.id,
            customer_id: customerId,
          },
        });
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = toStringOrNull(inv.customer);
        const explicitCompanyId =
          (inv.subscription_details?.metadata as Record<string, string>)?.company_id ??
          (inv.metadata as Record<string, string>)?.company_id ??
          null;
        const companyId = await findCompanyId(supabase, explicitCompanyId, customerId);
        if (!companyId) break;

        const invoiceNumber = inv.number ?? `STRIPE-${inv.id}`;

        await supabase.from("invoices").upsert({
          company_id: companyId,
          invoice_number: invoiceNumber,
          status: "paid",
          subtotal: (inv.subtotal ?? 0) / 100,
          tax_amount: (inv.tax ?? 0) / 100,
          total: (inv.amount_paid ?? inv.total ?? 0) / 100,
          currency: (inv.currency ?? "usd").toUpperCase(),
          paid_at: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : new Date().toISOString(),
          payment_method: "stripe",
          due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
          billing_period_start: inv.period_start
            ? new Date(inv.period_start * 1000).toISOString()
            : null,
          billing_period_end: inv.period_end
            ? new Date(inv.period_end * 1000).toISOString()
            : null,
          notes: inv.description ?? null,
          // @ts-ignore - Stripe invoice line items
          line_items: (inv.lines?.data ?? []).map((line: any) => ({
            description: line.description ?? "Subscription",
            quantity: line.quantity ?? 1,
            unit_price: (line.unit_amount_excluding_tax ?? line.amount ?? 0) / 100,
            total: (line.amount ?? 0) / 100,
          })),
          metadata: {
            stripe_invoice_id: inv.id,
            stripe_hosted_url: inv.hosted_invoice_url ?? null,
            stripe_subscription_id: toStringOrNull(inv.subscription),
          },
        }, { onConflict: "invoice_number" });

        const updates: Record<string, unknown> = {
          subscription_status: "active",
          trial_ends_at: null,
        };

        if (customerId) updates.stripe_customer_id = customerId;

        const subscriptionId = toStringOrNull(inv.subscription);
        if (subscriptionId) {
          updates.stripe_subscription_id = subscriptionId;
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
            const resolved = await resolvePlanFromSubscription(sub as Stripe.Subscription, supabase);
            if (resolved.tier) updates.subscription_tier = resolved.tier;
            if (resolved.interval) updates.subscription_billing_interval = resolved.interval;
            if (sub.current_period_start) {
              updates.subscription_start_date = new Date(sub.current_period_start * 1000).toISOString();
            }
            if (sub.current_period_end) {
              updates.subscription_end_date = new Date(sub.current_period_end * 1000).toISOString();
            }
          } catch (err) {
            console.error("Failed to refresh subscription on invoice.paid:", err);
          }
        } else {
          if (inv.period_start) {
            updates.subscription_start_date = new Date(inv.period_start * 1000).toISOString();
          }
          if (inv.period_end) {
            updates.subscription_end_date = new Date(inv.period_end * 1000).toISOString();
          }
        }

        await updateCompanySubscription(supabase, companyId, updates);
        await logBillingEvent(supabase, {
          action: "invoice_paid",
          targetType: "invoice",
          targetId: companyId,
          targetName: invoiceNumber,
          companyId,
          details: {
            source: "stripe_webhook",
            invoice_id: inv.id,
            invoice_number: invoiceNumber,
            amount_paid: (inv.amount_paid ?? inv.total ?? 0) / 100,
            currency: (inv.currency ?? "usd").toUpperCase(),
            subscription_id: toStringOrNull(inv.subscription),
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = toStringOrNull(inv.customer);
        const explicitCompanyId =
          (inv.subscription_details?.metadata as Record<string, string>)?.company_id ??
          (inv.metadata as Record<string, string>)?.company_id ??
          null;
        const companyId = await findCompanyId(supabase, explicitCompanyId, customerId);

        if (inv.number) {
          await supabase.from("invoices")
            .update({ status: "overdue" })
            .eq("invoice_number", inv.number);
        }

        await supabase
          .from("invoices")
          .update({ status: "overdue" })
          .contains("metadata", { stripe_invoice_id: inv.id });

        if (companyId) {
          const updates: Record<string, unknown> = {
            subscription_status: "inactive",
          };
          if (customerId) updates.stripe_customer_id = customerId;
          if (inv.subscription) updates.stripe_subscription_id = toStringOrNull(inv.subscription);
          await updateCompanySubscription(supabase, companyId, updates);
        }
        await logBillingEvent(supabase, {
          action: "invoice_payment_failed",
          targetType: "invoice",
          targetId: companyId,
          targetName: inv.number ?? `STRIPE-${inv.id}`,
          companyId,
          details: {
            source: "stripe_webhook",
            invoice_id: inv.id,
            invoice_number: inv.number ?? null,
            customer_id: customerId,
            subscription_id: toStringOrNull(inv.subscription),
          },
        });
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = toStringOrNull(session.customer);
        const explicitCompanyId =
          toStringOrNull(session.client_reference_id) ??
          (session.metadata?.company_id as string | null) ??
          null;
        const companyId = await findCompanyId(supabase, explicitCompanyId, customerId);
        if (!companyId) break;

        const resolvedFromSession = await resolvePlanFromCheckoutSession(session, stripe, supabase);
        let tier = resolvedFromSession.tier;
        let interval = resolvedFromSession.interval;

        let subscription: Stripe.Subscription | null = null;
        const subscriptionId = toStringOrNull(session.subscription);
        if (subscriptionId) {
          try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
            const resolvedFromSubscription = await resolvePlanFromSubscription(subscription, supabase);
            tier = resolvedFromSubscription.tier ?? tier;
            interval = resolvedFromSubscription.interval ?? interval;
          } catch (err) {
            console.error("Failed retrieving subscription from checkout.session.completed:", err);
          }
        }

        const updates: Record<string, unknown> = {
          subscription_status: "active",
          trial_ends_at: null,
        };

        if (tier) updates.subscription_tier = tier;
        if (interval) updates.subscription_billing_interval = interval;
        if (customerId) updates.stripe_customer_id = customerId;
        if (subscriptionId) updates.stripe_subscription_id = subscriptionId;

        if (subscription?.current_period_start) {
          updates.subscription_start_date = new Date(subscription.current_period_start * 1000).toISOString();
        } else if (subscription?.start_date) {
          updates.subscription_start_date = new Date(subscription.start_date * 1000).toISOString();
        }

        if (subscription?.current_period_end) {
          updates.subscription_end_date = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await updateCompanySubscription(supabase, companyId, updates);
        await logBillingEvent(supabase, {
          action: "checkout_session_completed",
          targetType: "subscription",
          targetId: companyId,
          targetName: `${tier ?? "unknown"} checkout`,
          companyId,
          details: {
            source: "stripe_webhook",
            session_id: session.id,
            subscription_id: subscriptionId,
            customer_id: customerId,
            plan: tier,
            interval,
          },
        });
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = toStringOrNull(session.customer);
        const explicitCompanyId =
          toStringOrNull(session.client_reference_id) ??
          (session.metadata?.company_id as string | null) ??
          null;
        const companyId = await findCompanyId(supabase, explicitCompanyId, customerId);
        if (!companyId) break;

        const updates: Record<string, unknown> = {
          subscription_status: "inactive",
        };
        if (customerId) updates.stripe_customer_id = customerId;
        if (session.subscription) updates.stripe_subscription_id = toStringOrNull(session.subscription);

        await updateCompanySubscription(supabase, companyId, updates);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session expired:", session.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler Error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
