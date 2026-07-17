import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase setzt die Session automatisch wenn der User über den
    // Reset-Link kommt (hash enthält access_token + type=recovery).
    //
    // Der alte Fallback hat JEDE bestehende Session als gültig akzeptiert -
    // dadurch konnte jeder, der bereits eingeloggt ist (oder kurzen Zugriff
    // auf ein entsperrtes Gerät hat), einfach /reset-password aufrufen und
    // das Passwort ohne Eingabe des alten Passworts ändern. Gültig ist nur
    // ein echter Recovery-Link, erkennbar an type=recovery im URL-Hash.
    const isRecoveryLink = window.location.hash.includes("type=recovery");

    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
    });

    if (isRecoveryLink) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setValidSession(true);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Die Passwörter stimmen nicht überein");
      return;
    }

    if (password.length < 8) {
      toast.error("Das Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setDone(true);
      setTimeout(() => navigate("/auth"), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : "Fehler beim Zurücksetzen";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!validSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Ungültiger Link</CardTitle>
              <CardDescription>
                Dieser Reset-Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => navigate("/forgot-password")}
              >
                Neuen Link anfordern
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo-full.svg" alt="Safe-Forward" className="h-12" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Neues Passwort setzen</CardTitle>
            <CardDescription>
              Wähle ein neues Passwort für deinen Account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-4">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Passwort geändert!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Du wirst automatisch zum Login weitergeleitet...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      data-testid="reset-password-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mindestens 8 Zeichen"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      autoFocus
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Passwort wiederholen"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">
                    Die Passwörter stimmen nicht überein
                  </p>
                )}

                <Button
                  type="submit"
                  data-testid="reset-password-submit"
                  className="w-full"
                  disabled={isLoading || (!!password && !!confirmPassword && password !== confirmPassword)}
                >
                  {isLoading ? "Speichern..." : "Passwort speichern"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
