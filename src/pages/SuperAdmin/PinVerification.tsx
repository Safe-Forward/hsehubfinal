import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function SuperAdminPinVerification() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, signOut } = useAuth();

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30; // seconds

  useEffect(() => {
    // If not super_admin, redirect to dashboard
    if (userRole && userRole !== "super_admin") {
      navigate("/dashboard", { replace: true });
    }

    // Check if already verified
    const pinVerified = sessionStorage.getItem("superAdminPinVerified");
    if (pinVerified === "true") {
      navigate("/super-admin/dashboard", { replace: true });
    }
  }, [userRole, navigate]);

  useEffect(() => {
    // Unlock after timeout
    if (locked) {
      const timer = setTimeout(() => {
        setLocked(false);
        setAttempts(0);
      }, LOCK_DURATION * 1000);
      return () => clearTimeout(timer);
    }
  }, [locked]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setPin(value);
    }
  };

  const verifyPin = async () => {
    if (locked) {
      toast({
        title: "Account Locked",
        description: `Too many failed attempts. Please wait ${LOCK_DURATION} seconds.`,
        variant: "destructive",
      });
      return;
    }

    if (!pin || pin.length < 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a valid PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call the RPC function to verify PIN
      const { data, error } = await supabase.rpc("verify_super_admin_pin", {
        input_pin: pin,
      });

      if (error) {
        console.error("PIN verification error:", error);
        throw error;
      }

      if (data === true) {
        // PIN correct - store verification in session
        sessionStorage.setItem("superAdminPinVerified", "true");
        
        toast({
          title: "Access Granted",
          description: "Welcome to Super Admin Panel",
        });

        navigate("/super-admin/dashboard", { replace: true });
      } else {
        // PIN incorrect
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setLocked(true);
          toast({
            title: "Account Locked",
            description: `Too many failed attempts. Locked for ${LOCK_DURATION} seconds.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Incorrect PIN",
            description: `${MAX_ATTEMPTS - newAttempts} attempts remaining`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("PIN verification failed:", error);
      toast({
        title: "Verification Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verifyPin();
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("superAdminPinVerified");
    await signOut();
    navigate("/auth", { replace: true });
  };

  const handleForgotPin = async () => {
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail("superadmin@safe-forward.internal");
      if (error) throw error;
      setResetSent(true);
      toast({
        title: "Reset-Link gesendet",
        description: "Prüfe dein E-Mail-Postfach für den Reset-Link.",
      });
    } catch (error) {
      console.error("PIN reset error:", error);
      toast({
        title: "Fehler",
        description: "Reset-Link konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-gray-200 dark:border-gray-800 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Super Admin Access</CardTitle>
            <CardDescription className="mt-2">
              Enter your security PIN to access the platform administration panel
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {locked ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-red-600 dark:text-red-400">
                  Account Temporarily Locked
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Too many failed attempts. Please wait {LOCK_DURATION} seconds.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="••••••••••"
                    value={pin}
                    onChange={handlePinChange}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-14 text-lg font-mono"
                    maxLength={10}
                    disabled={loading}
                    autoFocus
                    autoComplete="off"
                    data-testid="superadmin-pin-input"
                  />
                </div>
                {attempts > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                    {MAX_ATTEMPTS - attempts} attempts remaining
                  </p>
                )}
              </div>

              <Button
                onClick={verifyPin}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                disabled={loading || !pin}
                data-testid="superadmin-pin-submit"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </span>
                ) : (
                  "Verify & Access"
                )}
              </Button>
            </>
          )}

          <div className="pt-2">
            {!showForgotPin ? (
              <Button
                variant="link"
                size="sm"
                className="w-full text-xs text-gray-400 hover:text-blue-500"
                onClick={() => setShowForgotPin(true)}
                data-testid="superadmin-forgot-pin"
              >
                <KeyRound className="w-3 h-3 mr-1" />
                PIN vergessen?
              </Button>
            ) : (
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-3">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">PIN zurücksetzen</p>
                {resetSent ? (
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Reset-Link wurde an <strong>superadmin@safe-forward.internal</strong> gesendet. Nach dem Login mit neuem Passwort kannst du unter <strong>/super-admin/set-pin</strong> einen neuen PIN setzen.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      Wir senden dir einen Reset-Link an <strong>superadmin@safe-forward.internal</strong>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleForgotPin}
                        disabled={resetSending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        {resetSending ? "Sende..." : "Reset-Link senden"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowForgotPin(false)}
                        className="text-xs"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              data-testid="superadmin-logout"
            >
              Cancel and Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400">
            This is a secured area. All access attempts are logged.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
