import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, ROUTE_PERMISSION_MAP, Permissions } from "@/hooks/usePermissions";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof Permissions;
  requiredRole?: 'super_admin' | 'company_admin' | 'employee';
  requiredTierFeature?: keyof Permissions;
}

// Card-less trial: these stay reachable even after the 7-day window lapses,
// so a locked-out admin can still pay (or sign out) instead of being fully
// stuck.
const ALLOWED_DURING_TRIAL_LOCK = ["/invoices", "/settings", "/profile"];

function TrialExpiredScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Testphase abgelaufen</h1>
        <p className="text-muted-foreground">
          Ihre 7-tägige Testphase ist beendet. Bitte wählen Sie einen Tarif, um HSE Hub weiter zu nutzen.
        </p>
        <Button onClick={() => navigate("/invoices")}>Jetzt Tarif wählen</Button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  requiredTierFeature,
}: ProtectedRouteProps) {
  const { user, loading: authLoading, userRole } = useAuth();
  const { permissions, loading: permissionsLoading, canAccessRoute, hasPermission } = usePermissions();
  const { loading: subscriptionLoading, canAccessFeature, canAccessRouteForTier, isTrialExpired } = useSubscriptionLimits();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const loading = authLoading || permissionsLoading || subscriptionLoading;

  // super_admin outranks every other role, so a route requiring
  // "company_admin" or "employee" must still admit a super_admin.
  const satisfiesRequiredRole = (role: typeof userRole, required: typeof requiredRole) => {
    if (!required) return true;
    if (role === "super_admin") return true;
    return role === required;
  };

  useEffect(() => {
    if (loading) return;

    // If not authenticated, redirect to auth
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Check permission
    let hasAccess = true;

    // Check role requirement first
    if (requiredRole) {
      if (!satisfiesRequiredRole(userRole, requiredRole)) {
        toast({
          title: "Access Denied",
          description: `This page requires ${requiredRole.replace('_', ' ')} role.`,
          variant: "destructive",
        });
        navigate("/dashboard", { replace: true });
        return;
      }
    }

    if (requiredPermission) {
      // Explicit permission requirement
      hasAccess = hasPermission(requiredPermission);
    } else {
      // Check based on route path
      hasAccess = canAccessRoute(location.pathname);
    }

    // Tier gating is separate from role/permission gating - a company_admin
    // on the Basic plan still shouldn't reach Training/Audits, even though
    // their role would normally grant every permission.
    let hasTierAccess = true;
    if (requiredTierFeature) {
      hasTierAccess = canAccessFeature(requiredTierFeature);
    } else {
      hasTierAccess = canAccessRouteForTier(location.pathname);
    }

    if (!hasAccess || !hasTierAccess) {
      toast({
        title: "Access Denied",
        description: !hasAccess
          ? "You don't have permission to access this page."
          : "Dieses Modul ist in Ihrem aktuellen Tarif nicht enthalten.",
        variant: "destructive",
      });
      navigate("/dashboard", { replace: true });
    }
  }, [
    loading,
    user,
    userRole,
    requiredPermission,
    requiredRole,
    requiredTierFeature,
    permissions,
    navigate,
    location.pathname,
    toast,
    canAccessRoute,
    hasPermission,
    canAccessFeature,
    canAccessRouteForTier,
  ]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, don't render (redirect will happen)
  if (!user) {
    return null;
  }

  
  // Check role requirement
  if (!satisfiesRequiredRole(userRole, requiredRole)) {
    return null;
  }
  
  // Check access
  let hasAccess = true;
  if (requiredPermission) {
    hasAccess = hasPermission(requiredPermission);
  } else {
    hasAccess = canAccessRoute(location.pathname);
  }

  let hasTierAccess = true;
  if (requiredTierFeature) {
    hasTierAccess = canAccessFeature(requiredTierFeature);
  } else {
    hasTierAccess = canAccessRouteForTier(location.pathname);
  }

  if (!hasAccess || !hasTierAccess) {
    return null;
  }

  // Card-less trial, expired, no Stripe subscription on file: lock everything
  // except billing/settings/profile so they can still pay or sign out.
  if (
    userRole !== "super_admin" &&
    isTrialExpired() &&
    !ALLOWED_DURING_TRIAL_LOCK.some((p) => location.pathname.startsWith(p))
  ) {
    return <TrialExpiredScreen />;
  }

  return children;
}
