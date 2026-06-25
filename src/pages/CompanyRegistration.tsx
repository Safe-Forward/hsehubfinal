import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AVV_VERSION } from "@/pages/AVV";

const registrationSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Unternehmensname muss mindestens 2 Zeichen lang sein"),
    companyEmail: z.string().email("Ungültige E-Mail-Adresse"),
    companyPhone: z.string().optional(),
    companyAddress: z.string().optional(),
    adminName: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
    adminEmail: z.string().email("Ungültige E-Mail-Adresse"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

type RegistrationForm = z.infer<typeof registrationSchema>;

const subscriptionPlans = [
  {
    tier: "basic",
    name: "Paket S",
    subtitle: "HSE Basic - Der digitale Einstieg",
    price: 149,
    maxEmployees: 5,
    users: "5 Benutzer (1 Administrator + 4 Benutzer)",
    description: "Für kleine Unternehmen, die ihre Arbeitsschutzverwaltung erstmals digitalisieren möchten.",
    features: [
      "Dashboard (Prüfungen, Termine, Dokumente)",
      "Mitarbeiterverwaltung (Stammdaten, Dateien)",
      "Untersuchungsmanagement (G-Untersuchungen, Termine, Planung)",
      "Dokumentenverwaltung (PDF, Bilder) (5 GB Speicherplatz)",
      "Standardberichte (CSV-/PDF-Export)",
      "Aufgabenliste",
      "Rollen und Berechtigungen (Arzt, Administrator, Unternehmen, Mitarbeiter)",
    ],
  },
  {
    tier: "standard",
    name: "Paket M",
    subtitle: "HSE Pro - Strukturierte Teamarbeit",
    price: 249,
    maxEmployees: 10,
    users: "10 Benutzer (1 Administrator + 9 Benutzer)",
    description: "Für KMU, die Prozesse, Rollen und Nachvollziehbarkeit benötigen.",
    features: [
      "Alle Funktionen aus den Paketen Basic und Pro",
      "Meldungen zu Vorfällen und Beinaheunfällen",
      "Risikobewertungen (GBU-Modul)",
      "Aktionsverfolgung",
      "Partnerintegrationen über API-Token (z. B. Labor / Arzt / Dienstleister)",
    ],
    popular: true,
  },
  {
    tier: "premium",
    name: "Paket L",
    subtitle: "HSE Enterprise - Für mittelständische Unternehmen und Konzerne",
    price: 349,
    maxEmployees: 999,
    users: "Kein Limit",
    description: "Alle fachlichen HSE-Funktionen auf Organisationsebene.",
    features: [
      "Alle Funktionen von Basic + Pro + Enterprise",
      "Schulungsmanagement",
      "Kurse (bis zu 20 Kurse)",
      "Fortschrittsüberwachung",
      "Zertifikate (PDF)",
      "Audit Management",
      "Mehrere Standorte / Unternehmen verwalten",
      "Standortübergreifende Berichte",
      "Prioritäts-Support",
    ],
  },
];

const addOns = [
  {
    id: "quickstart",
    name: "Gezielte Einführung",
    description: "Unverzichtbare Sicherheitsschulungen für Ihr Team",
    price: 149,
    period: "einmalig",
  },
  {
    id: "setup",
    name: "Setup gemeistert",
    description: "Schnelle Einarbeitung und Unterstützung bei der Einrichtung",
    price: 149,
    period: "einmalig",
  },
  {
    id: "priority-support",
    name: "Prioritäts-Support",
    description: "Engagierter Support mit kürzeren Reaktionszeiten",
    price: 49,
    period: "Monat",
  },
  {
    id: "multi-site-basic",
    name: "Multi-Site Basic",
    description: "Bis zu 3 Standorte (29 Euro pro zusätzlichem Standort)",
    price: 99,
    period: "Monat",
  },
  {
    id: "custom-course-upload",
    name: "Eigenen Kurs hochladen",
    description: "Laden Sie Ihre eigenen Schulungsinhalte hoch und verwalten Sie sie",
    price: 49,
    period: "Monat",
  },
  {
    id: "storage-50gb",
    name: "Speicher+ 50 GB",
    description: "Zusätzlicher Speicherplatz für Ihre Dokumente",
    price: 19,
    period: "Monat",
    group: "storage",
  },
  {
    id: "storage-200gb",
    name: "Speicher+ 200 GB",
    description: "Zusätzlicher Speicherplatz für Ihre Dokumente",
    price: 59,
    period: "Monat",
    group: "storage",
  },
  {
    id: "storage-unlimited",
    name: "Speicher+ Unbegrenzt",
    description: "Unbegrenzter Speicherplatz für Ihre Dokumente",
    price: 149,
    period: "Monat",
    group: "storage",
  },
];

export default function CompanyRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium">("standard");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToAvv, setAgreedToAvv] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const toggleAddOn = (addOnId: string) => {
    const addOn = addOns.find((a) => a.id === addOnId);
    setSelectedAddOns((prev) => {
      if (addOn?.group === "storage") {
        const withoutStorage = prev.filter(
          (id) => !addOns.find((a) => a.id === id && a.group === "storage")
        );
        if (prev.includes(addOnId)) {
          return withoutStorage;
        }
        return [...withoutStorage, addOnId];
      }
      if (prev.includes(addOnId)) {
        return prev.filter((id) => id !== addOnId);
      }
      return [...prev, addOnId];
    });
  };

  const onSubmit = async (data: RegistrationForm) => {
    if (!agreedToAvv) {
      toast({
        title: "Bestätigung erforderlich",
        description: "Bitte akzeptieren Sie die Datenschutzerklärung und den Auftragsverarbeitungsvertrag (AVV).",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await supabase.auth.signOut();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.adminName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Benutzererstellung fehlgeschlagen");

      // register_company takes user_id as a plain parameter (it's
      // SECURITY DEFINER, not auth.uid()-based) and is callable by anon -
      // it never needed an active session. Previously this called
      // signInWithPassword first, which always failed with "Email not
      // confirmed" whenever the project requires email confirmation
      // (it does here), so registration could never actually complete -
      // it died before register_company ever ran. Add-on selection is now
      // handled inside register_company itself, so it works regardless of
      // confirmation status too.
      const selectedPlan = subscriptionPlans.find((p) => p.tier === selectedTier)!;

      const { data: registrationResult, error: registrationError } = await (
        supabase as any
      ).rpc("register_company", {
        registration_data: {
          user_id: authData.user.id,
          company_name: data.companyName,
          company_email: data.companyEmail,
          company_phone: data.companyPhone || "",
          company_address: data.companyAddress || "",
          subscription_tier: selectedTier,
          max_employees: selectedPlan.maxEmployees,
          admin_email: data.adminEmail,
          admin_name: data.adminName,
          selected_addon_codes: selectedAddOns,
          avv_accepted: agreedToAvv,
          avv_version: AVV_VERSION,
        },
      } as any);

      if (registrationError) {
        console.error("Registrierungsfehler:", registrationError);
        throw registrationError;
      }

      if (registrationResult && !(registrationResult as any).success) {
        throw new Error(
          (registrationResult as any).error || "Registrierung fehlgeschlagen"
        );
      }

      toast({
        title: "Erfolgreich!",
        description: "Ihr Unternehmen wurde erstellt! Bitte warten Sie, während wir alles einrichten...",
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await supabase.auth.signOut();

      toast({
        title: "Fast geschafft!",
        description: "Bitte bestätigen Sie ggf. Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben, und melden Sie sich anschließend an, um auf Ihr neues Unternehmens-Dashboard zuzugreifen.",
      });

      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    } catch (error: any) {
      console.error("Registrierungsfehler:", error);
      toast({
        title: "Registrierung fehlgeschlagen",
        description: error.message || "Bei der Registrierung ist ein Fehler aufgetreten",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-background dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="-ml-4 hover:bg-transparent hover:text-primary"
          >
            Zurück zur Startseite
          </Button>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/logo-icon.svg"
              alt="Safe-Forward Logo"
              className="h-12 w-12 relative z-10"
            />
            <h1 className="text-4xl font-bold">Safe-Forward</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Paket wählen und Unternehmen registrieren
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            7 Tage kostenlos testen - Keine Kreditkarte erforderlich
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Ihr Paket wählen</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <Card
                key={plan.tier}
                className={`cursor-pointer transition-all ${
                  selectedTier === plan.tier
                    ? "ring-2 ring-primary shadow-lg scale-105"
                    : "hover:shadow-md"
                } ${plan.popular ? "border-green-500 border-2" : ""}`}
                onClick={() => setSelectedTier(plan.tier as "basic" | "standard" | "premium")}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.popular && (
                      <Badge className="bg-green-700">Beliebt</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mb-2 font-semibold text-gray-700">
                    {plan.subtitle}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground"> Euro/Monat</span>
                  </div>
                  <p className="text-sm text-blue-600 font-semibold mt-2">{plan.users}</p>
                  <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Unternehmensregistrierung</CardTitle>
                <CardDescription>
                  Geben Sie Ihre Unternehmens- und Administratordaten ein, um loszulegen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Unternehmensdaten</h3>
                    <div>
                      <Label htmlFor="companyName">Unternehmensname *</Label>
                      <Input
                        id="companyName"
                        {...register("companyName")}
                        placeholder="Mustermann GmbH"
                      />
                      {errors.companyName && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.companyName.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyEmail">Rechnungs-E-Mail *</Label>
                        <Input
                          id="companyEmail"
                          type="email"
                          {...register("companyEmail")}
                          placeholder="buchhaltung@unternehmen.de"
                        />
                        {errors.companyEmail && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.companyEmail.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="companyPhone">Telefon (optional)</Label>
                        <Input
                          id="companyPhone"
                          {...register("companyPhone")}
                          placeholder="+49 (0) 123 456789"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="companyAddress">Adresse (optional)</Label>
                      <Textarea
                        id="companyAddress"
                        {...register("companyAddress")}
                        placeholder="Musterstrasse 1, 12345 Musterstadt"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Administratorkonto</h3>
                    <div>
                      <Label htmlFor="adminName">Vollständiger Name *</Label>
                      <Input
                        id="adminName"
                        {...register("adminName")}
                        placeholder="Max Mustermann"
                      />
                      {errors.adminName && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.adminName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="adminEmail">E-Mail *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        {...register("adminEmail")}
                        placeholder="max@unternehmen.de"
                      />
                      {errors.adminEmail && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.adminEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password">Passwort *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            {...register("password")}
                            placeholder="........"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.password.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Passwort bestätigen *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            {...register("confirmPassword")}
                            placeholder="........"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="avv-acceptance"
                      checked={agreedToAvv}
                      onChange={(e) => setAgreedToAvv(e.target.checked)}
                      className="mt-1 cursor-pointer"
                    />
                    <label htmlFor="avv-acceptance" className="text-sm text-muted-foreground cursor-pointer">
                      Ich akzeptiere die{" "}
                      <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Datenschutzerklärung
                      </a>{" "}
                      und den{" "}
                      <a href="/avv" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Auftragsverarbeitungsvertrag (AVV)
                      </a>.
                    </label>
                  </div>

                  <div className="flex flex-col gap-4">
                    <Button type="submit" size="lg" disabled={loading || !agreedToAvv} className="w-full">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Konto wird erstellt...
                        </>
                      ) : (
                        `7 Tage kostenlos testen (${
                          subscriptionPlans.find((p) => p.tier === selectedTier)?.name
                        })`
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Bereits ein Konto?{" "}
                      <a href="/auth" className="text-primary underline">
                        Jetzt anmelden
                      </a>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Verfügbare Add-ons</CardTitle>
                <CardDescription className="text-xs">
                  Erweitern Sie Ihr Paket mit optionalen Funktionen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {addOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAddOns.includes(addOn.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleAddOn(addOn.id)}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(addOn.id)}
                        onChange={() => toggleAddOn(addOn.id)}
                        className="mt-1 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={addOn.name}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{addOn.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {addOn.description}
                        </div>
                        <div className="text-sm font-bold text-primary mt-1">
                          {addOn.price} Euro / {addOn.period}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
