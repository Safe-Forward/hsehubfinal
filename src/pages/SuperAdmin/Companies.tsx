import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Pencil, Eye, Search } from "lucide-react";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subscription_tier: "basic" | "standard" | "premium";
  subscription_status: "active" | "inactive" | "cancelled" | "trial";
  max_employees: number;
  created_at: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
}

export default function SuperAdminCompanies() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && (!user || userRole !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === "super_admin") {
      fetchCompanies();
    }
  }, [user, userRole]);

  const fetchCompanies = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany) return;

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          subscription_tier: editingCompany.subscription_tier,
          subscription_status: editingCompany.subscription_status,
          max_employees: editingCompany.max_employees,
        })
        .eq("id", editingCompany.id);

      if (error) throw error;

      toast({
        title: "Erfolgreich",
        description: "Unternehmen erfolgreich aktualisiert",
      });
      setEditingCompany(null);
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trial: "secondary",
      inactive: "outline",
      cancelled: "destructive",
    };
    return variants[status] || "outline";
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      basic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      standard: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      premium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    };
    return colors[tier] || "";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Unternehmensverwaltung</h2>
        <p className="text-muted-foreground">
          Alle registrierten Unternehmen und ihre Abonnements anzeigen und verwalten
        </p>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Unternehmen nach Name oder E-Mail suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{companies.length}</p>
              <p className="text-sm text-muted-foreground">Unternehmen gesamt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Unternehmen</CardTitle>
          <CardDescription>
            Abonnements, Limits und Unternehmensdetails verwalten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unternehmen</TableHead>
                  <TableHead>Abonnement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Max. Mitarbeiter</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Keine Unternehmen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {company.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierBadge(company.subscription_tier)}>
                          {company.subscription_tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(company.subscription_status)}>
                          {company.subscription_status === "active" ? "Aktiv" : company.subscription_status === "trial" ? "Test" : company.subscription_status === "cancelled" ? "Gekündigt" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.max_employees}</TableCell>
                      <TableCell>
                        {new Date(company.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/super-admin/companies/${company.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingCompany(company)}
                          >
                            <Pencil className="w-4 h-4" />
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

      {/* View Company Dialog */}
      <Dialog
        open={!!selectedCompany}
        onOpenChange={() => setSelectedCompany(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Unternehmensdetails</DialogTitle>
            <DialogDescription>
              Vollständige Informationen zu {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Unternehmensname</Label>
                <p className="font-medium">{selectedCompany.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">E-Mail</Label>
                <p className="font-medium">{selectedCompany.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Telefon</Label>
                <p className="font-medium">{selectedCompany.phone || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Abonnement-Stufe
                </Label>
                <p className="font-medium capitalize">
                  {selectedCompany.subscription_tier}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium capitalize">
                  {selectedCompany.subscription_status === "active" ? "Aktiv" : selectedCompany.subscription_status === "trial" ? "Test" : selectedCompany.subscription_status === "cancelled" ? "Gekündigt" : "Inaktiv"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Max. Mitarbeiter</Label>
                <p className="font-medium">{selectedCompany.max_employees}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Erstellt</Label>
                <p className="font-medium">
                  {new Date(selectedCompany.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Unternehmens-ID</Label>
                <p className="font-mono text-xs">{selectedCompany.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog
        open={!!editingCompany}
        onOpenChange={() => setEditingCompany(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unternehmen bearbeiten</DialogTitle>
            <DialogDescription>
              Abonnementeinstellungen für {editingCompany?.name} aktualisieren
            </DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4">
              <div>
                <Label>Abonnement-Stufe</Label>
                <Select
                  value={editingCompany.subscription_tier}
                  onValueChange={(value: any) =>
                    setEditingCompany({
                      ...editingCompany,
                      subscription_tier: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Abonnementstatus</Label>
                <Select
                  value={editingCompany.subscription_status}
                  onValueChange={(value: any) =>
                    setEditingCompany({
                      ...editingCompany,
                      subscription_status: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Test</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                    <SelectItem value="cancelled">Gekündigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max. Mitarbeiter</Label>
                <Input
                  type="number"
                  value={editingCompany.max_employees}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      max_employees: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingCompany(null)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleUpdateCompany}>Änderungen speichern</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
