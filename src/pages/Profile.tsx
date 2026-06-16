import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Save, Mail, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NOTIF_CATEGORIES = [
  { key: "task", label: "Tasks & Mentions in Tasks" },
  { key: "mention", label: "Mentions in Notes" },
  { key: "training", label: "Training" },
  { key: "audit", label: "Audits" },
  { key: "measure", label: "Measures" },
  { key: "risk", label: "Risk Assessments" },
  { key: "checkup", label: "Health Check-Ups" },
];

type NotifPref = { in_app_enabled: boolean; email_enabled: boolean };

export default function Profile() {
  const { user, loading, userRole, companyId } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
  });

  // ── Notification preferences state ──────────────────────────────────────
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, NotifPref>>({});
  const [isLoadingNotifPrefs, setIsLoadingNotifPrefs] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch profile data from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      setIsLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, full_name")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          toast({
            title: "Error",
            description: "Failed to load profile data",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          setProfileData({
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            email: data.email || user.email || "",
          });
        }
      } catch (error) {
        console.error("Unexpected error fetching profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  // ── Fetch the employee record + existing notification preferences ───────
  useEffect(() => {
    const fetchNotifPrefs = async () => {
      if (!user?.id || !companyId) return;

      setIsLoadingNotifPrefs(true);
      try {
        // Try to resolve the employee record for the logged-in user.
        // First by email, then by user_id as a fallback (mirrors the pattern
        // used elsewhere in the app, e.g. Tasks.tsx / EmployeeProfile.tsx).
        let empId: string | null = null;

        if (user.email) {
          const { data: empByEmail } = await supabase
            .from("employees")
            .select("id")
            .ilike("email", user.email)
            .eq("company_id", companyId)
            .maybeSingle();
          empId = empByEmail?.id || null;
        }

        if (!empId) {
          const { data: empByUserId } = await supabase
            .from("employees")
            .select("id")
            .eq("user_id", user.id)
            .eq("company_id", companyId)
            .maybeSingle();
          empId = empByUserId?.id || null;
        }

        setEmployeeId(empId);

        if (empId) {
          const { data: prefs, error: prefsError } = await supabase
            .from("notification_preferences")
            .select("category, in_app_enabled, email_enabled")
            .eq("employee_id", empId);

          if (prefsError) {
            console.error("Error fetching notification preferences:", prefsError);
          }

          const prefsMap: Record<string, NotifPref> = {};
          (prefs || []).forEach((p: any) => {
            prefsMap[p.category] = {
              in_app_enabled: p.in_app_enabled,
              email_enabled: p.email_enabled,
            };
          });
          setNotifPrefs(prefsMap);
        }
      } catch (error) {
        console.error("Unexpected error fetching notification preferences:", error);
      } finally {
        setIsLoadingNotifPrefs(false);
      }
    };

    fetchNotifPrefs();
  }, [user, companyId]);

  // ── Update a single preference (in_app_enabled or email_enabled) ─────────
  const updateNotifPref = async (
    category: string,
    field: "in_app_enabled" | "email_enabled",
    value: boolean
  ) => {
    if (!employeeId || !companyId) {
      toast({
        title: "Error",
        description: "Could not determine your employee record. Preferences cannot be saved.",
        variant: "destructive",
      });
      return;
    }

    const current: NotifPref =
      notifPrefs[category] || { in_app_enabled: true, email_enabled: true };
    const updated: NotifPref = { ...current, [field]: value };

    // Optimistic UI update
    setNotifPrefs((prev) => ({ ...prev, [category]: updated }));

    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            employee_id: employeeId,
            company_id: companyId,
            category,
            in_app_enabled: updated.in_app_enabled,
            email_enabled: updated.email_enabled,
          },
          { onConflict: "employee_id,category" }
        );

      if (error) throw error;
    } catch (error) {
      console.error("Error updating notification preference:", error);
      toast({
        title: "Error",
        description: "Failed to update notification preference",
        variant: "destructive",
      });
      // Revert optimistic update on failure
      setNotifPrefs((prev) => ({ ...prev, [category]: current }));
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profileData.firstName.trim() || null,
          last_name: profileData.lastName.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("profile.updated"),
        description: t("profile.updatedDesc"),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Unexpected error updating profile:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Generate avatar initials from profile data
  const getAvatarInitials = () => {
    if (profileData.firstName && profileData.lastName) {
      return `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase();
    }
    if (profileData.firstName) {
      return profileData.firstName.charAt(0).toUpperCase();
    }
    if (profileData.email) {
      return profileData.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("profile.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("profile.subtitle")}
              </p>
            </div>
          </div>
          {isEditing && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : t("profile.saveChanges")}
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t("profile.general")}</TabsTrigger>
            <TabsTrigger value="security">{t("profile.security")}</TabsTrigger>
            <TabsTrigger value="preferences">
              {t("profile.preferences")}
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.picture")}</CardTitle>
                <CardDescription>{t("profile.pictureDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-2xl">
                      {getAvatarInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      {t("profile.changePicture")}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.pictureFormat")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("profile.personalInfo")}</CardTitle>
                <CardDescription>
                  {t("profile.personalInfoDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("profile.firstName")}</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          firstName: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("profile.lastName")}</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          lastName: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("profile.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      className="pl-10"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.emailNote")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {t("profile.role")} {userRole?.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline">
                    {t("profile.companyId")} {companyId?.slice(0, 8)}
                  </Badge>
                </div>

                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} className="w-full">
                    {t("profile.editProfile")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.changePassword")}</CardTitle>
                <CardDescription>
                  {t("profile.changePasswordDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">
                    {t("profile.currentPassword")}
                  </Label>
                  <Input id="current" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">{t("profile.newPassword")}</Label>
                  <Input id="new" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">
                    {t("profile.confirmPassword")}
                  </Label>
                  <Input id="confirm" type="password" />
                </div>
                <Button>{t("profile.updatePassword")}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("profile.twoFactor")}</CardTitle>
                <CardDescription>{t("profile.twoFactorDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline">{t("profile.enable2FA")}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.languageSettings")}</CardTitle>
                <CardDescription>
                  {t("profile.languageSettingsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">{t("profile.language")}</Label>
                  <div className="relative">
                    <Languages className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <select
                      id="language"
                      value={language}
                      onChange={(e) =>
                        setLanguage(e.target.value as "de" | "en")
                      }
                      className="w-full pl-10 h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="de">{t("profile.german")}</option>
                      <option value="en">{t("profile.english")}</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Notification Preferences ───────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.notifications")}</CardTitle>
                <CardDescription>
                  Choose which notifications you want to receive, and how.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!employeeId && !isLoadingNotifPrefs ? (
                  <p className="text-sm text-muted-foreground">
                    No employee record could be matched to your account, so
                    notification preferences are not available.
                  </p>
                ) : isLoadingNotifPrefs ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-[1fr_70px_70px] gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                      <span>Category</span>
                      <span className="text-center">In-App</span>
                      <span className="text-center">Email</span>
                    </div>
                    {NOTIF_CATEGORIES.map((cat) => {
                      const pref = notifPrefs[cat.key];
                      const inAppChecked = pref?.in_app_enabled ?? true;
                      const emailChecked = pref?.email_enabled ?? true;
                      return (
                        <div
                          key={cat.key}
                          className="grid grid-cols-[1fr_70px_70px] gap-4 items-center py-2 border-b last:border-b-0"
                        >
                          <span className="text-sm">{cat.label}</span>
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={inAppChecked}
                              onChange={(e) =>
                                updateNotifPref(
                                  cat.key,
                                  "in_app_enabled",
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 cursor-pointer"
                            />
                          </div>
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={emailChecked}
                              onChange={(e) =>
                                updateNotifPref(
                                  cat.key,
                                  "email_enabled",
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
