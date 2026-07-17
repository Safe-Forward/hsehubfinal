import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
// supabase import kept for potential future use
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
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Nutzt Edge Function → Brevo (nicht Supabase-eigenes Mail-System)
      const { error } = await supabase.functions.invoke("send-password-reset-email", {
        body: { email },
      });

      if (error) throw error;

      // Immer Success zeigen (verhindert User-Enumeration)
      setSent(true);
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : "Fehler beim Senden der E-Mail";
      toast.error(message);
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
            onClick={() => navigate("/auth")}
            className="hover:bg-transparent hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Zurück zum Login</span>
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo-full.svg" alt="Safe-Forward" className="h-12" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Passwort zurücksetzen</CardTitle>
            <CardDescription>
              Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deines Passworts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="bg-primary/10 rounded-full p-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">E-Mail gesendet!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Prüfe deinen Posteingang und klicke auf den Link in der E-Mail.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Zurück zum Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@firma.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    data-testid="forgot-password-email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="forgot-password-submit">
                  {isLoading ? "Senden..." : "Reset-Link senden"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Abbrechen
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
