import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "@/components/ProtectedRoute";

// The hard trial-lockout is the only thing standing between a card-less
// signup and a company using HSE Hub forever for free past day 7. A
// regression here either locks out a paying customer (stripe_subscription_id
// present but still shown the lock screen) or never locks out an
// expired non-payer at all.

let mockAuth: { user: any; loading: boolean; userRole: string | null };
let mockPermissions: { permissions: any; loading: boolean; canAccessRoute: () => boolean; hasPermission: () => boolean };
let mockSubscription: {
  loading: boolean;
  canAccessFeature: () => boolean;
  canAccessRouteForTier: () => boolean;
  isTrialExpired: () => boolean;
};
let mockPathname = "/dashboard";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: mockPathname }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockPermissions,
  ROUTE_PERMISSION_MAP: {},
}));

vi.mock("@/hooks/useSubscriptionLimits", () => ({
  useSubscriptionLimits: () => mockSubscription,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("ProtectedRoute - trial lockout", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    mockAuth = { user: { id: "user-1" }, loading: false, userRole: "company_admin" };
    mockPermissions = {
      permissions: {},
      loading: false,
      canAccessRoute: () => true,
      hasPermission: () => true,
    };
    mockSubscription = {
      loading: false,
      canAccessFeature: () => true,
      canAccessRouteForTier: () => true,
      isTrialExpired: () => false,
    };
  });

  it("renders children normally when trial is not expired", () => {
    render(
      <ProtectedRoute>
        <div>Dashboard Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("shows the lock screen instead of children when trial is expired on a locked route", () => {
    mockSubscription.isTrialExpired = () => true;
    mockPathname = "/employees";

    render(
      <ProtectedRoute>
        <div>Dashboard Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText("Dashboard Content")).not.toBeInTheDocument();
    expect(screen.getByText("Testphase abgelaufen")).toBeInTheDocument();
  });

  it("still allows /invoices through even when trial is expired, so the admin can pay", () => {
    mockSubscription.isTrialExpired = () => true;
    mockPathname = "/invoices";

    render(
      <ProtectedRoute>
        <div>Invoices Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Invoices Content")).toBeInTheDocument();
    expect(screen.queryByText("Testphase abgelaufen")).not.toBeInTheDocument();
  });

  it("still allows /settings through even when trial is expired", () => {
    mockSubscription.isTrialExpired = () => true;
    mockPathname = "/settings";

    render(
      <ProtectedRoute>
        <div>Settings Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Settings Content")).toBeInTheDocument();
  });

  it("never locks out super_admin even if isTrialExpired somehow returns true", () => {
    mockAuth.userRole = "super_admin";
    mockSubscription.isTrialExpired = () => true;
    mockPathname = "/employees";

    render(
      <ProtectedRoute>
        <div>Dashboard Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("does not lock out a company with an active Stripe subscription even past trial_ends_at", () => {
    // isTrialExpired() itself already encodes this (false once
    // stripe_subscription_id is set) - this test guards the call site:
    // ProtectedRoute must actually trust that return value and not apply
    // any separate date check of its own.
    mockSubscription.isTrialExpired = () => false;
    mockPathname = "/employees";

    render(
      <ProtectedRoute>
        <div>Dashboard Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });
});
