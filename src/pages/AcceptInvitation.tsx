import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, UserPlus, Mail, User, Briefcase, Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TokenData {
  team_member_id: string;
  expires_at: string;
  used_at: string | null;
}

interface MemberData {
  first_name: string;
  last_name: string;
  email: string;
  company_id: string;
  role: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Ungültiger Einladungslink – kein Token angegeben.");
        setLoading(false);
        return;
      }

      try {
        // Sign out any existing session to ensure clean anonymous access
        // This prevents issues when someone clicks an invite while logged in as another user
        await supabase.auth.signOut();

        // Use the SECURITY DEFINER function to validate token and get member info
        // This bypasses RLS and works for anonymous users
        const { data: result, error: rpcError } = await supabase.rpc(
          "validate_invitation_token",
          { p_token: token }
        );

        if (rpcError) {
          setError("Die Einladung konnte nicht geprüft werden. Bitte prüfen Sie den Link oder wenden Sie sich an Ihren Administrator.");
          setLoading(false);
          return;
        }

        if (!result || !result.valid) {
          setError(result?.error || "Ungültiger Einladungslink. Bitte wenden Sie sich an Ihren Administrator, um eine neue Einladung zu erhalten.");
          setLoading(false);
          return;
        }

        // Set token data from the RPC result
        setTokenData({
          team_member_id: result.team_member_id,
          expires_at: "", // Not needed since validation passed
          used_at: null,
        });

        // Set member data from the RPC result
        setMemberData({
          first_name: result.first_name,
          last_name: result.last_name,
          email: result.email,
          company_id: result.company_id,
          role: result.role,
        });

        setLoading(false);
      } catch (err) {
        setError("Beim Prüfen der Einladung ist ein Fehler aufgetreten.");
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberData || !tokenData || !token) return;

    if (password.length < 8) {
      toast({
        title: "Passwort zu kurz",
        description: "Das Passwort muss mindestens 8 Zeichen lang sein.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwörter stimmen nicht überein",
        description: "Bitte stellen Sie sicher, dass beide Passwörter identisch sind.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create user account via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: memberData.email,
        password: password,
        options: {
          data: {
            first_name: memberData.first_name,
            last_name: memberData.last_name,
            full_name: `${memberData.first_name} ${memberData.last_name}`,
            company_id: memberData.company_id,
            role: memberData.role,
          },
        },
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes("already registered")) {
          toast({
            title: "Konto existiert bereits",
            description: "Ein Konto mit dieser E-Mail-Adresse existiert bereits. Bitte melden Sie sich stattdessen an.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        throw authError;
      }

      // Get the new user's ID
      const newUserId = authData.user?.id;
      if (!newUserId) {
        throw new Error("Benutzer-ID nach Registrierung konnte nicht ermittelt werden.");
      }

      // Call the accept_team_invitation function to handle all the database updates
      // This function runs with elevated privileges to bypass RLS
      const { data: acceptResult, error: acceptError } = await supabase.rpc(
        "accept_team_invitation",
        {
          p_token: token,
          p_user_id: newUserId,
        }
      );

      if (acceptError) {
        throw new Error("Die Einladung konnte nicht vollständig angenommen werden.");
      }

      if (!acceptResult?.success) {
        throw new Error(acceptResult?.error || "Die Einladung konnte nicht angenommen werden.");
      }

      setSuccess(true);
      
      toast({
        title: "Konto erfolgreich erstellt!",
        description: "Du kannst dich jetzt bei HSE Hub anmelden.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);

    } catch (err: any) {
      toast({
        title: "Fehler beim Erstellen",
        description: err.message || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Shared wrapper elements as variables (not components)
  const backgroundElements = (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-400/10 to-green-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-tr from-green-400/10 to-blue-400/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 mb-8 text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-green-600/20 blur-2xl rounded-full scale-150" />
          <div className="relative bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-white/50">
            <Shield className="w-12 h-12 text-primary" />
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          HSE Hub
        </h1>
        <p className="text-sm text-muted-foreground">Arbeits- und Umweltschutz-Management</p>
      </div>
    </>
  );

  const backToLoginButton = (
    <div className="relative z-10 mt-6">
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-primary"
        onClick={() => navigate("/auth")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zur Anmeldung
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5 p-4 relative overflow-hidden">
        {backgroundElements}
        <div className="relative z-10 w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                  <Loader2 className="relative w-12 h-12 animate-spin text-primary" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">Einladung wird geprüft</h2>
                <p className="mt-2 text-muted-foreground text-sm">Bitte warten Sie, während Ihr Einladungslink verifiziert wird …</p>
              </div>
            </CardContent>
          </Card>
        </div>
        {backToLoginButton}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5 p-4 relative overflow-hidden">
        {backgroundElements}
        <div className="relative z-10 w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden" data-testid="accept-invitation-error">
            <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500" />
            <CardHeader className="text-center pb-4">
              <div className="relative inline-block mx-auto">
                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                <div className="relative bg-red-50 p-4 rounded-full">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <CardTitle className="mt-4 text-xl text-red-600">Einladung ungültig</CardTitle>
              <CardDescription>Ihre Einladung konnte nicht verifiziert werden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Der Einladungslink ist möglicherweise abgelaufen oder wurde bereits verwendet.
                </p>
                <Button
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                >
                  Zur Anmeldung
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {backToLoginButton}
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5 p-4 relative overflow-hidden">
        {backgroundElements}
        <div className="relative z-10 w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
            <CardHeader className="text-center pb-4">
              <div className="relative inline-block mx-auto">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
                <div className="relative bg-green-50 p-4 rounded-full">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <CardTitle className="mt-4 text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Willkommen bei HSE Hub!
              </CardTitle>
              <CardDescription>Ihr Konto wurde erfolgreich erstellt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm text-green-700">
                  Ihr Konto ist einsatzbereit! Sie können jetzt auf alle Funktionen Ihrer Rolle zugreifen.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Weiterleitung zur Anmeldung …</span>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                Jetzt zur Anmeldung
              </Button>
            </CardContent>
          </Card>
        </div>
        {backToLoginButton}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5 p-4 relative overflow-hidden">
      {backgroundElements}
      <div className="relative z-10 w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-600 to-green-600" />
          <CardHeader className="text-center pb-4">
            <div className="relative inline-block mx-auto">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative bg-primary/10 p-4 rounded-full">
                <UserPlus className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="mt-4 text-xl bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Einladung annehmen
            </CardTitle>
            <CardDescription>
              Willkommen! Legen Sie Ihr Passwort fest, um dem Team beizutreten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info Card */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-blue-100/50">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vollständiger Name</p>
                    <p className="font-medium text-foreground">{memberData?.first_name} {memberData?.last_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Mail className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-Mail-Adresse</p>
                    <p className="font-medium text-foreground">{memberData?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ihre Rolle</p>
                    <Badge variant="secondary" className="mt-0.5 bg-gradient-to-r from-blue-100 to-green-100 text-blue-700 border-0">
                      {memberData?.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleAcceptInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Passwort erstellen</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Passwort eingeben"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-10 bg-white border-gray-200 focus:border-primary h-11"
                    data-testid="accept-invitation-password"
                  />
                  <span 
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none"
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Mindestens 8 Zeichen erforderlich
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Passwort bestätigen</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Passwort wiederholen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10 bg-white border-gray-200 focus:border-primary h-11"
                  />
                  <span 
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30"
                disabled={submitting}
                size="lg"
                data-testid="accept-invitation-submit"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Konto wird erstellt …
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Konto erstellen &amp; Team beitreten
                  </>
                )}
              </Button>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Mit der Kontoerstellung stimmen Sie unseren Nutzungsbedingungen und der Datenschutzerklärung zu.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {backToLoginButton}
    </div>
  );
}
