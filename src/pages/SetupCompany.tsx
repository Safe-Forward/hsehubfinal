import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";

export default function SetupCompany() {
  const { user, companyId, refreshUserRole } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [companyName, setCompanyName] = useState("My Company");
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    email: string | null;
    created_at: string | null;
  } | null>(null);
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false);
  const [companyInfoError, setCompanyInfoError] = useState<string | null>(null);

  const loadCompanyInfo = async (id: string) => {
    setCompanyInfoLoading(true);
    setCompanyInfoError(null);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("name, email, created_at")
        .eq("id", id)
        .single();

      if (error) {
        setCompanyInfoError(error.message);
        setCompanyInfo(null);
      } else {
        setCompanyInfo(data);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load company details";
      setCompanyInfoError(message);
      setCompanyInfo(null);
    } finally {
      setCompanyInfoLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadCompanyInfo(companyId);
    } else {
      setCompanyInfo(null);
      setCompanyInfoError(null);
      setCompanyInfoLoading(false);
    }
  }, [companyId]);

  const handleCreateCompany = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    setIsCreating(true);
    try {
      console.log("Attempting to create company:", {
        name: companyName.trim(),
        email: user.email,
        userId: user.id,
      });

      // Try to use RPC function to bypass RLS
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "create_company_with_admin" as any,
        {
          p_company_name: companyName.trim(),
          p_user_email: user.email || "",
          p_user_id: user.id,
        }
      );

      if (rpcError) {
        console.error("RPC Error:", rpcError);

        // If function doesn't exist, fall back to direct insert
        const missingFunction =
          rpcError.code === "42883" ||
          rpcError.code === "PGRST301" ||
          (rpcError as any).status === 404 ||
          rpcError.message?.toLowerCase().includes("does not exist");

        if (missingFunction) {
          console.log("RPC not found, using direct insert fallback...");

          // Direct insert: create company
          const { data: companyData, error: companyError } = await supabase
            .from("companies")
            .insert({
              name: companyName.trim(),
              email: user.email,
              created_by: user.id,
            })
            .select("id")
            .single();

          if (companyError) {
            toast.error("Failed to create company: " + companyError.message);
            console.error("Company insert error:", companyError);
            return;
          }

          // Create user_role link
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: user.id,
              company_id: companyData.id,
              role: "company_admin",
            });

          if (roleError) {
            console.error("Role link error:", roleError);
            // Company created but role link failed - still show success
            toast.warning(
              "Company created but role link needs verification. Please refresh."
            );
          } else {
            toast.success("Company created successfully! Redirecting...");
          }

          await refreshUserRole();
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
          return;
        }

        if (rpcError.message?.toLowerCase().includes("already has a company")) {
          toast.info("You're already linked to a company. Loading details...");
          await refreshUserRole();
          return;
        }

        toast.error("Setup failed: " + rpcError.message);
        return;
      }

      console.log("Company created successfully:", rpcData);
      toast.success("Company created successfully! Redirecting...");
      await refreshUserRole();
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err) {
      console.error("Unexpected error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to create company: " + errorMsg);
    } finally {
      setIsCreating(false);
    }
  };
  if (companyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Building2 className="w-5 h-5" />
              Company Linked
            </CardTitle>
            <CardDescription className="text-sm">
              You are already assigned to a company. Review the details below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyInfoLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching company details...
              </div>
            )}

            {!companyInfoLoading && companyInfo && (
              <div className="space-y-2 text-sm mb-4">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <span className="ml-2 font-medium">{companyInfo.name}</span>
                </div>
                {companyInfo.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">
                      {companyInfo.email}
                    </span>
                  </div>
                )}
                {companyInfo.created_at && (
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2 font-medium">
                      {new Date(companyInfo.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {!companyInfoLoading && companyInfoError && (
              <p className="text-sm text-red-500 mb-4">
                Unable to load company details: {companyInfoError}
              </p>
            )}

            <div className="space-y-2">
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => loadCompanyInfo(companyId)}
                className="w-full"
              >
                Refresh Company Info
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" data-testid="setup-company-page">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="h-9 sm:h-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="w-full max-w-md mx-auto">
          <Card>
            <CardHeader className="space-y-2 sm:space-y-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                Setup Your Company
              </CardTitle>
              <CardDescription className="text-sm">
                Create a company to start managing employees and safety records.
                This only takes a few seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm sm:text-base">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  className="h-10 sm:h-11 text-sm sm:text-base"
                  data-testid="setup-company-name"
                />
              </div>

              <Button
                onClick={handleCreateCompany}
                disabled={isCreating || !companyName.trim()}
                className="w-full h-10 sm:h-11 text-sm sm:text-base"
                data-testid="setup-company-submit"
              >
                {isCreating ? "Creating..." : "Create Company"}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Logged in as:{" "}
                <strong className="break-all">{user?.email}</strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
