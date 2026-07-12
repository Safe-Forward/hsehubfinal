import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SuperAdminSetPin() {
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) setPin(value);
  };

  const handlePinConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) setPinConfirm(value);
  };

  const handleSetPin = async () => {
    if (pin.length < 4) {
      toast({ title: "PIN zu kurz", description: "Mindestens 4 Ziffern erforderlich.", variant: "destructive" });
      return;
    }
    if (pin !== pinConfirm) {
      toast({ title: "PINs stimmen nicht überein", description: "Bitte die gleiche PIN eingeben.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("set_super_admin_pin", { new_pin: pin });
      if (error) throw error;

      setDone(true);
      toast({ title: "PIN gesetzt", description: "Dein neuer PIN wurde erfolgreich gespeichert." });
    } catch (error: any) {
      console.error("Set PIN error:", error);
      toast({
        title: "Fehler",
        description: error?.message || "PIN konnte nicht gesetzt werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            <CardTitle className="text-2xl font-bold">Neuen PIN setzen</CardTitle>
            <CardDescription className="mt-2">
              Lege einen neuen Sicherheits-PIN für den Super-Admin-Zugang fest.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-green-600 dark:text-green-400">PIN erfolgreich gesetzt!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Du wirst zur PIN-Verifikation weitergeleitet.
                </p>
              </div>
              <Button
                onClick={() => navigate("/super-admin/verify", { replace: true })}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Zur PIN-Eingabe
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Neuer PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Neuer PIN (mind. 4 Ziffern)"
                      value={pin}
                      onChange={handlePinChange}
                      className="pl-10 h-12 text-lg font-mono"
                      maxLength={10}
                      disabled={loading}
                      autoFocus
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">PIN bestätigen</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="PIN wiederholen"
                      value={pinConfirm}
                      onChange={handlePinConfirmChange}
                      onKeyDown={(e) => e.key === "Enter" && handleSetPin()}
                      className="pl-10 h-12 text-lg font-mono"
                      maxLength={10}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSetPin}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                disabled={loading || !pin || !pinConfirm}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Speichern...
                  </span>
                ) : (
                  "PIN speichern"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
