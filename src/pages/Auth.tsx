import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { signIn, userRole, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect based on role after successful login
  useEffect(() => {
    if (loading || !userRole) return;
    
    if (userRole === "super_admin") {
      // Clear any previous PIN verification
      sessionStorage.removeItem("superAdminPinVerified");
      setRedirecting(true);
      // Redirect to PIN verification page immediately
      navigate("/super-admin/verify", { replace: true });
    } else if (redirecting) {
      // For regular users, go to dashboard after sign in
      navigate("/dashboard", { replace: true });
    }
  }, [userRole, loading, navigate, redirecting]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRedirecting(false);
    try {
      await signIn(loginEmail, loginPassword);
      toast.success("Signed in successfully");
      setRedirecting(true);
      // Navigation will be handled by useEffect based on role
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast.error(message || "Failed to sign in");
      setRedirecting(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-start absolute top-4 left-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="hover:bg-transparent hover:text-primary"
          >
            <span>← Back to Homepage</span>
          </Button>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo-full.svg" alt="Safe-Forward" className="h-12" />
          </div>
          <p className="text-muted-foreground mt-2"><span>HSE Management Platform</span></p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle><span>Welcome Back</span></CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email"><span>Email</span></Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password"><span>Password</span></Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                <span>{isLoading ? "Signing in..." : "Sign In"}</span>
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                  onClick={() => navigate("/forgot-password")}
                >
                  Passwort vergessen?
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Company Registration CTA */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            <span>Don't have an account yet?</span>
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/register")}
            className="w-full"
          >
            <span>Register Your Company - Start Free Trial</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
