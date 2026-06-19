import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function RefreshAuthButton() {
  const { refreshUserRole, companyId, userRole, loading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast({
      title: "Refreshing...",
      description: "Firmen- und Rolleninformationen werden neu geladen",
    });

    try {
      // First, try to auto-fix missing company link
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: fixResult } = await supabase.rpc('fix_my_company_link');
      
      console.log("Fix company link result:", fixResult);
      
      // Then refresh the auth context
      await refreshUserRole();
      
      // Force a page reload to ensure fresh state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      toast({
        title: "Refreshed!",
        description: fixResult?.success 
          ? "Company link created! Reloading page..." 
          : "Refreshing session...",
      });
    } catch (error) {
      console.error("Refresh error:", error);
      
      // If fix function doesn't exist, just refresh normally
      try {
        await refreshUserRole();
        toast({
          title: "Refreshed!",
          description: companyId 
            ? `Company loaded successfully` 
            : "Still no company found. Please sign out and back in.",
          variant: companyId ? "default" : "destructive",
        });
      } catch (refreshError) {
        toast({
          title: "Fehler",
          description: "Bitte ab- und erneut anmelden",
          variant: "destructive",
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing || loading}
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? "Refreshing..." : "Refresh Session"}
    </Button>
  );
}
