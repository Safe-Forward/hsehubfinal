import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Link as LinkIcon,
  Trash2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface ActivityGroup {
  id: string;
  name: string;
  description: string | null;
  hazards: string[] | null;
  required_ppe: string[] | null;
  created_at: string;
}

interface ExposureGroup {
  id: string;
  name: string;
  description: string | null;
  exposure_factors: string[] | null;
  created_at: string;
}

export default function ActivityGroups() {
  const { user, companyId, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [exposureGroups, setExposureGroups] = useState<ExposureGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExposureDialogOpen, setIsExposureDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<
    ActivityGroup | ExposureGroup | null
  >(null);

  // Form states for Activity Groups
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hazards: "",
    required_ppe: "",
  });

  // Form states for Exposure Groups
  const [exposureFormData, setExposureFormData] = useState({
    name: "",
    description: "",
    exposure_factors: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchActivityGroups();
      fetchExposureGroups();
    }
  }, [companyId]);

  const fetchActivityGroups = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("activity_groups" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivityGroups((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching activity groups:", error);
      toast({
        title: "Fehler",
        description: error.message || "Tätigkeitsgruppen konnten nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  const fetchExposureGroups = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("exposure_groups" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExposureGroups((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching exposure groups:", error);
      toast({
        title: "Fehler",
        description: error.message || "Expositionsgruppen konnten nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const hazardsArray = formData.hazards
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h);
      const ppeArray = formData.required_ppe
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);

      if (editingItem && "hazards" in editingItem) {
        // Update existing
        const { error } = await (supabase as any)
          .from("activity_groups")
          .update({
            name: formData.name,
            description: formData.description || null,
            hazards: hazardsArray.length > 0 ? hazardsArray : null,
            required_ppe: ppeArray.length > 0 ? ppeArray : null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Gespeichert",
          description: "Tätigkeitsgruppe wurde aktualisiert",
        });
      } else {
        // Create new
        const { error } = await supabase.from("activity_groups" as any).insert({
          company_id: companyId,
          name: formData.name,
          description: formData.description || null,
          hazards: hazardsArray.length > 0 ? hazardsArray : null,
          required_ppe: ppeArray.length > 0 ? ppeArray : null,
        } as any);

        if (error) throw error;
        toast({
          title: "Erstellt",
          description: "Tätigkeitsgruppe wurde erstellt",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchActivityGroups();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Tätigkeitsgruppe konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const handleSubmitExposure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const factorsArray = exposureFormData.exposure_factors
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f);

      if (editingItem && "exposure_factors" in editingItem) {
        // Update existing
        const { error } = await (supabase as any)
          .from("exposure_groups")
          .update({
            name: exposureFormData.name,
            description: exposureFormData.description || null,
            exposure_factors: factorsArray.length > 0 ? factorsArray : null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Gespeichert",
          description: "Expositionsgruppe wurde aktualisiert",
        });
      } else {
        // Create new
        const { error } = await supabase.from("exposure_groups" as any).insert({
          company_id: companyId,
          name: exposureFormData.name,
          description: exposureFormData.description || null,
          exposure_factors: factorsArray.length > 0 ? factorsArray : null,
        } as any);

        if (error) throw error;
        toast({
          title: "Erstellt",
          description: "Expositionsgruppe wurde erstellt",
        });
      }

      setIsExposureDialogOpen(false);
      resetExposureForm();
      fetchExposureGroups();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Expositionsgruppe konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Tätigkeitsgruppe wirklich löschen?"))
      return;

    try {
      const { error } = await supabase
        .from("activity_groups" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Gelöscht",
        description: "Tätigkeitsgruppe wurde gelöscht",
      });
      fetchActivityGroups();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Tätigkeitsgruppe konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExposure = async (id: string) => {
    if (!confirm("Expositionsgruppe wirklich löschen?"))
      return;

    try {
      const { error } = await supabase
        .from("exposure_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Gelöscht",
        description: "Expositionsgruppe wurde gelöscht",
      });
      fetchExposureGroups();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Expositionsgruppe konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  const handleEditActivity = (activity: ActivityGroup) => {
    setEditingItem(activity);
    setFormData({
      name: activity.name,
      description: activity.description || "",
      hazards: activity.hazards?.join(", ") || "",
      required_ppe: activity.required_ppe?.join(", ") || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditExposure = (exposure: ExposureGroup) => {
    setEditingItem(exposure);
    setExposureFormData({
      name: exposure.name,
      description: exposure.description || "",
      exposure_factors: exposure.exposure_factors?.join(", ") || "",
    });
    setIsExposureDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", hazards: "", required_ppe: "" });
    setEditingItem(null);
  };

  const resetExposureForm = () => {
    setExposureFormData({ name: "", description: "", exposure_factors: "" });
    setEditingItem(null);
  };

  const filteredActivityGroups = activityGroups.filter((ag) =>
    ag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExposureGroups = exposureGroups.filter((eg) =>
    eg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="h-9 sm:h-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Tätigkeits- &amp; Expositionsgruppen
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Tätigkeiten und Expositionsfaktoren für die automatische Risikozuweisung verwalten
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="activities" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-grid">
          <TabsTrigger value="activities" className="text-xs sm:text-sm">
            Tätigkeitsgruppen
          </TabsTrigger>
          <TabsTrigger value="exposures" className="text-xs sm:text-sm">
            Expositionsgruppen
          </TabsTrigger>
        </TabsList>

        {/* Activity Groups Tab */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tätigkeitsgruppen</CardTitle>
                  <CardDescription>
                    Definieren Sie Arbeitstätigkeiten der Mitarbeiter. Verknüpfen Sie
                    Tätigkeiten mit Risiken und Schulungsanforderungen für die Automatisierung.
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={resetForm}
                      className="w-full sm:w-auto text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tätigkeitsgruppe hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem
                          ? "Tätigkeitsgruppe bearbeiten"
                          : "Tätigkeitsgruppe erstellen"}
                      </DialogTitle>
                      <DialogDescription>
                        Tätigkeit mit zugehörigen Gefährdungen und erforderlicher PSA definieren
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitActivity} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name der Tätigkeit *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="z.B. Schweißarbeiten, Chemikalienhandhabung"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Beschreibung</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Ausführliche Beschreibung der Tätigkeit"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="hazards">Zugehörige Gefährdungen</Label>
                        <Textarea
                          id="hazards"
                          value={formData.hazards}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hazards: e.target.value,
                            })
                          }
                          placeholder="Gefährdungen kommagetrennt eingeben (z.B. Verbrennungen, UV-Strahlung, Dämpfe)"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Mehrere Gefährdungen mit Komma trennen
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="ppe">Erforderliche PSA</Label>
                        <Textarea
                          id="ppe"
                          value={formData.required_ppe}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              required_ppe: e.target.value,
                            })
                          }
                          placeholder="PSA kommagetrennt eingeben (z.B. Schweißerhelm, Handschuhe, Schutzbrille)"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Mehrere PSA-Elemente mit Komma trennen
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsDialogOpen(false);
                            resetForm();
                          }}
                        >
                          Abbrechen
                        </Button>
                        <Button type="submit">
                          {editingItem ? "Aktualisieren" : "Erstellen"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Tätigkeitsgruppen suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tätigkeitsbezeichnung</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Gefährdungen</TableHead>
                      <TableHead>Erforderliche PSA</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivityGroups.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Keine Tätigkeitsgruppen vorhanden. Erstellen Sie eine, um zu beginnen.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivityGroups.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-medium">
                            {activity.name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {activity.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {activity.hazards &&
                              activity.hazards.length > 0 ? (
                                activity.hazards
                                  .slice(0, 2)
                                  .map((hazard, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      {hazard}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  —
                                </span>
                              )}
                              {activity.hazards &&
                                activity.hazards.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{activity.hazards.length - 2} weitere
                                  </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {activity.required_ppe &&
                              activity.required_ppe.length > 0 ? (
                                activity.required_ppe
                                  .slice(0, 2)
                                  .map((ppe, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {ppe}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  —
                                </span>
                              )}
                              {activity.required_ppe &&
                                activity.required_ppe.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{activity.required_ppe.length - 2} weitere
                                  </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditActivity(activity)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteActivity(activity.id)
                                }
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exposure Groups Tab */}
        <TabsContent value="exposures" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expositionsgruppen</CardTitle>
                  <CardDescription>
                    Definieren Sie Expositionsfaktoren (Lärm, Chemikalien, biologische
                    Stoffe), denen Mitarbeiter ausgesetzt sein können
                  </CardDescription>
                </div>
                <Dialog
                  open={isExposureDialogOpen}
                  onOpenChange={setIsExposureDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={resetExposureForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Expositionsgruppe hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem
                          ? "Expositionsgruppe bearbeiten"
                          : "Expositionsgruppe erstellen"}
                      </DialogTitle>
                      <DialogDescription>
                        Expositionsfaktoren für Gesundheitsüberwachung und Risikobewertung definieren
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitExposure} className="space-y-4">
                      <div>
                        <Label htmlFor="exp-name">Name der Expositionsgruppe *</Label>
                        <Input
                          id="exp-name"
                          value={exposureFormData.name}
                          onChange={(e) =>
                            setExposureFormData({
                              ...exposureFormData,
                              name: e.target.value,
                            })
                          }
                          placeholder="z.B. Hohe Lärmbelastung, Chemikalienhandhabung"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp-description">Beschreibung</Label>
                        <Textarea
                          id="exp-description"
                          value={exposureFormData.description}
                          onChange={(e) =>
                            setExposureFormData({
                              ...exposureFormData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Ausführliche Beschreibung der Expositionsfaktoren"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="factors">Expositionsfaktoren</Label>
                        <Textarea
                          id="factors"
                          value={exposureFormData.exposure_factors}
                          onChange={(e) =>
                            setExposureFormData({
                              ...exposureFormData,
                              exposure_factors: e.target.value,
                            })
                          }
                          placeholder="Faktoren kommagetrennt eingeben (z.B. Lärm >85dB, Lösungsmittel, Staub)"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Mehrere Faktoren mit Komma trennen
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsExposureDialogOpen(false);
                            resetExposureForm();
                          }}
                        >
                          Abbrechen
                        </Button>
                        <Button type="submit">
                          {editingItem ? "Aktualisieren" : "Erstellen"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Expositionsgruppen suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expositionsgruppe</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Expositionsfaktoren</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExposureGroups.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Keine Expositionsgruppen vorhanden. Erstellen Sie eine, um zu beginnen.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExposureGroups.map((exposure) => (
                        <TableRow key={exposure.id}>
                          <TableCell className="font-medium">
                            {exposure.name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {exposure.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {exposure.exposure_factors &&
                              exposure.exposure_factors.length > 0 ? (
                                exposure.exposure_factors
                                  .slice(0, 3)
                                  .map((factor, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {factor}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  —
                                </span>
                              )}
                              {exposure.exposure_factors &&
                                exposure.exposure_factors.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{exposure.exposure_factors.length - 3} weitere
                                  </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditExposure(exposure)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteExposure(exposure.id)
                                }
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
