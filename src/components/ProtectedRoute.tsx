import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, ROUTE_PERMISSION_MAP, Permissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof Permissions;
  requiredRole?: 'super_admin' | 'company_admin' | 'employee';
}

export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  requiredRole
}: ProtectedRouteProps) {
  const { user, loading: authLoading, userRole } = useAuth();
  const { permissions, loading: permissionsLoading, canAccessRoute, hasPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const loading = authLoading || permissionsLoading;

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

    if (!hasAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
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
    permissions,
    navigate,
    location.pathname,
    toast,
    canAccessRoute,
    hasPermission,
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

  if (!hasAccess) {
    return null;
  }

  return children;
}
