import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "super_admin" | "company_admin" | "employee";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  companyId: string | null;
  companyName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[AuthContext] Initializing auth state...");

    // Set up auth state listener (robust unsubscribe and null checks)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthContext] Auth state changed: ${event}`, {
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
      });

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch user role immediately on auth change
        console.log("[AuthContext] User detected, fetching role...");
        fetchUserRole(session.user.id, 0);
      } else {
        // No user: clear role/company and stop loading
        console.log("[AuthContext] No user, clearing state");
        setUserRole(null);
        setCompanyId(null);
        setLoading(false);
      }
    });

    const subscription = data?.subscription;

    // Check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log("[AuthContext] Initial session check:", {
          hasSession: !!session,
          userEmail: session?.user?.email,
        });

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserRole(session.user.id, 0);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[AuthContext] Error getting initial session:", err);
        setLoading(false);
      });

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const isMissingRpcError = (error: Record<string, any>) => {
    if (!error) return false;
    const code = String(error.code ?? "");
    const message = String(error.message ?? "").toLowerCase();
    const details = String(error.details ?? "").toLowerCase();
    return (
      code === "PGRST301" ||
      message.includes("not found") ||
      message.includes("does not exist") ||
      details.includes("does not exist") ||
      details.includes("not found")
    );
  };

  const fetchCompanyContextViaTables = async (userId: string) => {
    console.warn("[AuthContext] Falling back to direct company lookup");

    // Use .select() with order to prioritize super_admin and handle duplicates
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(10);  // Get all roles, then pick the best one

    if (error) {
      throw error;
    }

    // Find the best role - prioritize super_admin
    let bestRole: UserRole | null = null;
    let bestCompanyId: string | null = null;

    if (data && data.length > 0) {
      // Check for super_admin first
      const superAdminRole = data.find(r => r.role === 'super_admin');
      if (superAdminRole) {
        bestRole = 'super_admin';
        bestCompanyId = superAdminRole.company_id;
      } else {
        // Otherwise use first available role
        bestRole = (data[0]?.role as UserRole) ?? null;
        bestCompanyId = data[0]?.company_id ?? null;
      }
    }

    console.log("[AuthContext] Resolved role:", bestRole, "company:", bestCompanyId);

    setUserRole(bestRole);
    setCompanyId(bestCompanyId);

    // Fetch company name (super_admin might not have a company)
    if (bestCompanyId) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("name")
        .eq("id", bestCompanyId)
        .single();
      setCompanyName(companyData?.name ?? null);
    } else if (bestRole === 'super_admin') {
      // Super admin without company - set a placeholder name
      setCompanyName("Platform Admin");
    }

    setLoading(false);

    // Update last login
    updateLastLogin(userId, bestCompanyId);
  };

  const fetchCompanyContextViaRpc = async () => {
    const { data, error } = await supabase.rpc("get_company_context");

    if (error) {
      if (isMissingRpcError(error)) {
        console.warn("[AuthContext] get_company_context RPC missing, using fallback");
        return { success: false };
      }
      console.error("[AuthContext] Error fetching company context via RPC:", error);
      throw error;
    }

    if (data?.success) {
      console.log("[AuthContext] Company context loaded via RPC", data);
      const role = (data.role as UserRole) ?? "company_admin";
      setUserRole(role);
      setCompanyId(data.company_id ?? null);

      // Fetch company name or set placeholder for super_admin
      if (data.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", data.company_id)
          .single();
        setCompanyName(companyData?.name ?? null);
      } else if (role === 'super_admin') {
        // Super admin without company - set a placeholder name
        setCompanyName("Platform Admin");
      }

      setLoading(false);

      // Update last login
      // We need the userId here. Let's rely on the caller or just get it from session if available?
      // Better to pass userId as arg to this function.
      return { success: true, companyId: data.company_id };
    }

    return { success: false };
  };

  const updateLastLogin = async (userId: string, companyId: string | null = null) => {
    try {
      // Update last login timestamp
      await supabase
        .from("user_roles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("user_id", userId);

      console.log("[AuthContext] Updated last_login_at for user:", userId);

      // Create audit log entry for login
      try {
        // Fetch user IP (best effort)
        let userIp = "Unknown";
        try {
          const ipResponse = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipResponse.json();
          userIp = ipData.ip;
        } catch (ipError) {
          console.warn("[AuthContext] Could not fetch IP address");
        }

        await supabase.rpc("create_audit_log", {
          p_action_type: "login",
          p_target_type: "user",
          p_target_id: userId,
          p_target_name: user?.email || "Unknown User",
          p_details: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            ip: userIp,
          },
          p_company_id: companyId,
        });
        console.log("[AuthContext] Created audit log for login");
      } catch (auditError) {
        console.error("[AuthContext] Failed to create audit log:", auditError);
        // Don't throw - audit logging is not critical for auth flow
      }
    } catch (error) {
      console.error("[AuthContext] Failed to update last_login_at:", error);
      // Don't throw - this is not critical for auth flow
    }
  };

  const fetchUserRole = async (userId: string, retryCount = 0) => {
    try {
      console.log(`[AuthContext] Fetching user role for ${userId}, attempt ${retryCount + 1}`);

      const rpcResult = await fetchCompanyContextViaRpc();
      if (rpcResult.success) {
        // Update last login after successful role fetch
        await updateLastLogin(userId, rpcResult.companyId);
        return;
      }

      await fetchCompanyContextViaTables(userId);
      // updateLastLogin is called inside fetchCompanyContextViaTables now
    } catch (error) {
      console.error("[AuthContext] Error fetching user role:", error);
      if (retryCount < 3) {
        setTimeout(() => fetchUserRole(userId, retryCount + 1), 1000);
      } else {
        setUserRole(null);
        setCompanyId(null);
        setLoading(false);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Log logout action before clearing session
    try {
      if (user?.id && companyId) {
        await supabase.rpc("create_audit_log", {
          p_action_type: "logout",
          p_target_type: "user",
          p_target_id: user.id,
          p_target_name: user.email || "Unknown User",
          p_details: { timestamp: new Date().toISOString() },
          p_company_id: companyId,
        });
      }
    } catch (e) {
      // Non-critical - ignore
    }

    // Clear super admin PIN verification
    sessionStorage.removeItem("superAdminPinVerified");

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserRole(null);
    setCompanyId(null);
    setCompanyName(null);
    navigate("/auth");
  };

  const refreshUserRole = async () => {
    console.log("[AuthContext] Manual refresh requested");
    if (user?.id) {
      setLoading(true);
      await fetchUserRole(user.id, 0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        companyId,
        companyName,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
