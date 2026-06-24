import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";

// Tier gating directly controls what a paying customer can see and use -
// a silent regression here means either leaking a feature to a tier that
// didn't pay for it, or locking out a tier that should have access. These
// tests exist to catch exactly that without needing a live Supabase project.

let mockCompany: Record<string, unknown> | null = null;
let mockAddonRows: Array<{ addon_definitions: { code: string } }> = [];
let mockAuth: { companyId: string | null; userRole: string | null; loading: boolean };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockCompany }),
            }),
          }),
        };
      }
      if (table === "company_addons") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: mockAddonRows }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

const BYTES_PER_GB = 1024 ** 3;

describe("useSubscriptionLimits", () => {
  beforeEach(() => {
    mockCompany = null;
    mockAddonRows = [];
    mockAuth = { companyId: "company-1", userRole: "company_admin", loading: false };
  });

  it("basic tier cannot access trainings/audits but can access dashboard", async () => {
    mockCompany = { subscription_tier: "basic", subscription_status: "trial", max_employees: 5, trial_ends_at: null, stripe_subscription_id: null };

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canAccessFeature("dashboard")).toBe(true);
    expect(result.current.canAccessFeature("trainings")).toBe(false);
    expect(result.current.canAccessFeature("audits")).toBe(false);
    expect(result.current.canAccessFeature("incidents")).toBe(false);
  });

  it("standard tier gets incidents/riskAssessments but not trainings/audits", async () => {
    mockCompany = { subscription_tier: "standard", subscription_status: "active", max_employees: 20, trial_ends_at: null, stripe_subscription_id: "sub_1" };

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canAccessFeature("incidents")).toBe(true);
    expect(result.current.canAccessFeature("riskAssessments")).toBe(true);
    expect(result.current.canAccessFeature("trainings")).toBe(false);
    expect(result.current.canAccessFeature("audits")).toBe(false);
  });

  it("premium tier gets everything", async () => {
    mockCompany = { subscription_tier: "premium", subscription_status: "active", max_employees: 100, trial_ends_at: null, stripe_subscription_id: "sub_1" };

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canAccessFeature("trainings")).toBe(true);
    expect(result.current.canAccessFeature("audits")).toBe(true);
  });

  it("super_admin bypasses tier restrictions regardless of company tier", async () => {
    mockCompany = { subscription_tier: "basic", subscription_status: "trial", max_employees: 5, trial_ends_at: null, stripe_subscription_id: null };
    mockAuth.userRole = "super_admin";

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canAccessFeature("trainings")).toBe(true);
    expect(result.current.canAccessFeature("audits")).toBe(true);
  });

  it("trial is expired only when past trial_ends_at AND no stripe_subscription_id", async () => {
    mockCompany = {
      subscription_tier: "basic",
      subscription_status: "trial",
      max_employees: 5,
      trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
      stripe_subscription_id: null,
    };

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isTrialExpired()).toBe(true);
  });

  it("trial is NOT expired if a real Stripe subscription is already attached", async () => {
    mockCompany = {
      subscription_tier: "basic",
      subscription_status: "trial",
      max_employees: 5,
      trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      stripe_subscription_id: "sub_real",
    };

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isTrialExpired()).toBe(false);
  });

  it("trial is NOT expired while trial_ends_at is still in the future", async () => {
    mockCompany = {
      subscription_tier: "basic",
      subscription_status: "trial",
      max_employees: 5,
      trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      stripe_subscription_id: null,
    };

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isTrialExpired()).toBe(false);
  });

  it("storage limit is the tier base plus active storage add-ons", async () => {
    mockCompany = { subscription_tier: "basic", subscription_status: "active", max_employees: 5, trial_ends_at: null, stripe_subscription_id: "sub_1" };
    mockAddonRows = [{ addon_definitions: { code: "storage-50gb" } }];

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getStorageLimitBytes()).toBe(5 * BYTES_PER_GB + 50 * BYTES_PER_GB);
  });

  it("storage-unlimited add-on overrides everything to Infinity", async () => {
    mockCompany = { subscription_tier: "basic", subscription_status: "active", max_employees: 5, trial_ends_at: null, stripe_subscription_id: "sub_1" };
    mockAddonRows = [{ addon_definitions: { code: "storage-unlimited" } }];

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getStorageLimitBytes()).toBe(Infinity);
  });

  it("custom-course-upload add-on does NOT unlock trainings on a basic tier", async () => {
    // Regression guard: this add-on only unlocks file upload inside an
    // already-accessible training module (Premium tier), it must not act
    // as a backdoor into the trainings module itself for lower tiers.
    mockCompany = { subscription_tier: "basic", subscription_status: "active", max_employees: 5, trial_ends_at: null, stripe_subscription_id: "sub_1" };
    mockAddonRows = [{ addon_definitions: { code: "custom-course-upload" } }];

    const { result } = renderHook(() => useSubscriptionLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canAccessFeature("trainings")).toBe(false);
    expect(result.current.hasAddon("custom-course-upload")).toBe(true);
  });
});
