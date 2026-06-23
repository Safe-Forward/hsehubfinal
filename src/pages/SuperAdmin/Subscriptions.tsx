import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Users,
  Check,
  X,
} from "lucide-react";

interface SubscriptionPackage {
  id: string;
  name: string;
  tier: "basic" | "standard" | "premium";
  price_monthly: number;
  price_yearly: number;
  max_employees: number;
  features: string[];
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  is_active: boolean;
  created_at: string;
}

const defaultFeatures = {
  basic: [
    "Dashboard (Prüfungen, Termine, Dokumente)",
    "Mitarbeiterverwaltung (Stammdaten, Dateien)",
    "Untersuchungsmanagement (G-Untersuchungen, Termine, Planung)",
    "Dokumentenverwaltung (PDF, Bilder) (5 GB Speicherplatz)",
    "Standardberichte (CSV-/PDF-Export)",
    "Aufgabenliste",
    "Rollen und Berechtigungen (Arzt, Administrator, Unternehmen, Mitarbeiter)",
  ],
  standard: [
    "Alle Funktionen aus den Paketen Basic und Pro",
    "Meldungen zu Vorfällen und Beinaheunfällen",
    "Risikobewertungen (GBU-Modul)",
    "Aktionsverfolgung",
    "Partnerintegrationen über API-Token (z. B. Labor / Arzt / Dienstleister)",
  ],
  premium: [
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
};

export default function Subscriptions() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    tier: "basic" as "basic" | "standard" | "premium",
    price_monthly: 0,
    price_yearly: 0,
    max_employees: 10,
    features: [] as string[],
    stripe_price_id_monthly: "",
    stripe_price_id_yearly: "",
    is_active: true,
  });
  const [newFeature, setNewFeature] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === "super_admin") {
      fetchPackages();
      fetchStats();
    }
  }, [user, userRole]);

  const fetchPackages = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("subscription_packages")
        .select("*")
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      
      // Transform features from JSONB to array
      const transformedData = (data || []).map(pkg => ({
        ...pkg,
        features: Array.isArray(pkg.features) ? pkg.features : [],
      }));
      
      setPackages(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get subscription counts
      const { count: totalSubscribers } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true });

      const { count: activeSubscriptions } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active");

      const { count: trialUsers } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "trial");

      // Calculate monthly revenue
      const { data: activeCompanies } = await supabase
        .from("companies")
        .select("subscription_tier")
        .eq("subscription_status", "active");

      const tierPrices: Record<string, number> = {
        basic: 149,
        standard: 249,
        premium: 349,
      };

      const monthlyRevenue = activeCompanies?.reduce((sum, company) => {
        return sum + (tierPrices[company.subscription_tier] || 0);
      }, 0) || 0;

      setStats({
        totalSubscribers: totalSubscribers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        trialUsers: trialUsers || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleOpenDialog = (pkg?: SubscriptionPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        tier: pkg.tier,
        price_monthly: pkg.price_monthly,
        price_yearly: pkg.price_yearly,
        max_employees: pkg.max_employees,
        features: pkg.features || [],
        stripe_price_id_monthly: pkg.stripe_price_id_monthly || "",
        stripe_price_id_yearly: pkg.stripe_price_id_yearly || "",
        is_active: pkg.is_active,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: "",
        tier: "basic",
        price_monthly: 0,
        price_yearly: 0,
        max_employees: 10,
        features: defaultFeatures.basic,
        stripe_price_id_monthly: "",
        stripe_price_id_yearly: "",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const packageData = {
        name: formData.name,
        tier: formData.tier,
        price_monthly: formData.price_monthly,
        price_yearly: formData.price_yearly,
        max_employees: formData.max_employees,
        features: formData.features,
        stripe_price_id_monthly: formData.stripe_price_id_monthly || null,
        stripe_price_id_yearly: formData.stripe_price_id_yearly || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingPackage) {
        const { error } = await supabase
          .from("subscription_packages")
          .update(packageData)
          .eq("id", editingPackage.id);

        if (error) throw error;
        toast({ title: "Success", description: "Package updated successfully" });
      } else {
        const { error } = await supabase
          .from("subscription_packages")
          .insert(packageData);

        if (error) throw error;
        toast({ title: "Success", description: "Package created successfully" });
      }

      setIsDialogOpen(false);
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const handleTierChange = (tier: "basic" | "standard" | "premium") => {
    setFormData({
      ...formData,
      tier,
      features: defaultFeatures[tier],
    });
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      basic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      standard: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      premium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    };
    return colors[tier] || "";
  };

  if (loading || loadingData) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Subscription Plans</h2>
        <p className="text-muted-foreground">
          Manage subscription packages and pricing for your platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscribers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.trialUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{stats.monthlyRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subscription Packages</CardTitle>
            <CardDescription>
              Configure pricing and features for each subscription tier
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Monthly Price</TableHead>
                <TableHead>Yearly Price</TableHead>
                <TableHead>Max Employees</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>
                    <Badge className={getTierColor(pkg.tier)}>
                      {pkg.tier.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>€{pkg.price_monthly}/mo</TableCell>
                  <TableCell>€{pkg.price_yearly}/yr</TableCell>
                  <TableCell>{pkg.max_employees}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {pkg.features?.length || 0} features
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pkg.is_active ? "default" : "secondary"}>
                      {pkg.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(pkg)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Create New Package"}
            </DialogTitle>
            <DialogDescription>
              Configure the subscription package details and features
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value: any) => handleTierChange(value)}
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Monthly Price (€)</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_yearly">Yearly Price (€)</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_employees">Max Employees</Label>
                <Input
                  id="max_employees"
                  type="number"
                  value={formData.max_employees}
                  onChange={(e) => setFormData({ ...formData, max_employees: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stripe_monthly">Stripe Price ID (Monthly)</Label>
                <Input
                  id="stripe_monthly"
                  value={formData.stripe_price_id_monthly}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })}
                  placeholder="price_xxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe_yearly">Stripe Price ID (Yearly)</Label>
                <Input
                  id="stripe_yearly"
                  value={formData.stripe_price_id_yearly}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id_yearly: e.target.value })}
                  placeholder="price_xxxxx"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Package is active and available for purchase</Label>
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add a feature..."
                  onKeyPress={(e) => e.key === "Enter" && handleAddFeature()}
                />
                <Button type="button" onClick={handleAddFeature}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {formData.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted p-2 rounded-md"
                  >
                    <span className="text-sm">{feature}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveFeature(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPackage ? "Update Package" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
