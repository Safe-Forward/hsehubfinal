import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Permissions, ROUTE_PERMISSION_MAP } from "@/hooks/usePermissions";

export type SubscriptionTier = "basic" | "standard" | "premium";

// Mirrors exactly what's promised on the registration page
// (src/pages/CompanyRegistration.tsx subscriptionPlans) - each tier includes
// everything the previous one does, plus its own additions.
const TIER_FEATURES: Record<SubscriptionTier, (keyof Permissions)[]> = {
  basic: ["dashboard", "employees", "healthCheckups", "documents", "reports", "settings"],
  standard: [
    "dashboard", "employees", "healthCheckups", "documents", "reports", "settings",
    "incidents", "riskAssessments", "investigations",
  ],
  premium: [
    "dashboard", "employees", "healthCheckups", "documents", "reports", "settings",
    "incidents", "riskAssessments", "investigations",
    "trainings", "audits",
  ],
};

const BYTES_PER_GB = 1024 ** 3;

const TIER_BASE_STORAGE_BYTES: Record<SubscriptionTier, number> = {
  basic: 5 * BYTES_PER_GB,
  standard: 20 * BYTES_PER_GB,
  premium: 100 * BYTES_PER_GB,
};

const STORAGE_ADDON_BYTES: Record<string, number> = {
  "storage-50gb": 50 * BYTES_PER_GB,
  "storage-200gb": 200 * BYTES_PER_GB,
};

interface SubscriptionState {
  tier: SubscriptionTier;
  status: string;
  maxEmployees: number;
  trialEndsAt: string | null;
  stripeSubscriptionId: string | null;
  activeAddonCodes: string[];
}

const DEFAULT_STATE: SubscriptionState = {
  tier: "basic",
  status: "trial",
  maxEmployees: 0,
  trialEndsAt: null,
  stripeSubscriptionId: null,
  activeAddonCodes: [],
};

export function useSubscriptionLimits() {
  const { companyId, userRole, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    if (!companyId) {
      setState(DEFAULT_STATE);
      setLoading(false);
      return;
    }

    const [{ data: company }, { data: addonRows }] = await Promise.all([
      supabase
        .from("companies")
        .select("subscription_tier, subscription_status, max_employees, trial_ends_at, stripe_subscription_id")
        .eq("id", companyId)
        .single(),
      supabase
        .from("company_addons")
        .select("addon_definitions:addon_id(code)")
        .eq("company_id", companyId)
        .eq("status", "active"),
    ]);

    setState({
      tier: (company?.subscription_tier as SubscriptionTier) ?? "basic",
      status: company?.subscription_status ?? "trial",
      maxEmployees: company?.max_employees ?? 0,
      trialEndsAt: company?.trial_ends_at ?? null,
      stripeSubscriptionId: company?.stripe_subscription_id ?? null,
      activeAddonCodes: (addonRows ?? [])
        .map((row: any) => row.addon_definitions?.code)
        .filter((code: unknown): code is string => typeof code === "string"),
    });
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (!authLoading) fetchState();
  }, [authLoading, fetchState]);

  // Tier gating is a billing restriction, not a role restriction - unlike
  // usePermissions().hasPermission(), company_admin does NOT bypass this.
  // Only super_admin (platform operator, not tied to a paying company) does.
  const canAccessFeature = useCallback(
    (feature: keyof Permissions): boolean => {
      if (userRole === "super_admin") return true;
      return TIER_FEATURES[state.tier]?.includes(feature) ?? false;
    },
    [state.tier, userRole]
  );

  // Mirrors usePermissions().canAccessRoute() so every existing protected
  // route gets tier-gated automatically, without having to add a prop to
  // each <ProtectedRoute> usage in App.tsx individually.
  const canAccessRouteForTier = useCallback(
    (path: string): boolean => {
      if (userRole === "super_admin") return true;
      const basePath = "/" + path.split("/")[1];
      const featureKey = ROUTE_PERMISSION_MAP[basePath];
      if (!featureKey) return true;
      return canAccessFeature(featureKey);
    },
    [canAccessFeature, userRole]
  );

  const hasAddon = useCallback(
    (code: string) => state.activeAddonCodes.includes(code),
    [state.activeAddonCodes]
  );

  const getStorageLimitBytes = useCallback((): number => {
    if (hasAddon("storage-unlimited")) return Infinity;
    let total = TIER_BASE_STORAGE_BYTES[state.tier] ?? TIER_BASE_STORAGE_BYTES.basic;
    for (const code of state.activeAddonCodes) {
      total += STORAGE_ADDON_BYTES[code] ?? 0;
    }
    return total;
  }, [state.tier, state.activeAddonCodes, hasAddon]);

  // Card-less trial: expired means the 7-day window passed and no Stripe
  // subscription was ever attached (a real subscriber's trial_ends_at may
  // also be in the past once Stripe converts them, but they'll have a
  // stripe_subscription_id by then).
  const isTrialExpired = useCallback((): boolean => {
    if (state.status !== "trial") return false;
    if (!state.trialEndsAt) return false;
    if (state.stripeSubscriptionId) return false;
    return new Date(state.trialEndsAt) < new Date();
  }, [state.status, state.trialEndsAt, state.stripeSubscriptionId]);

  return {
    loading: loading || authLoading,
    tier: state.tier,
    status: state.status,
    maxEmployees: state.maxEmployees,
    canAccessFeature,
    canAccessRouteForTier,
    hasAddon,
    getStorageLimitBytes,
    isTrialExpired,
    refresh: fetchState,
  };
}
