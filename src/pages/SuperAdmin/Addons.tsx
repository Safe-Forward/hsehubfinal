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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Puzzle,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Package,
  Building2,
  Check,
  X,
  Search,
  ShoppingCart,
} from "lucide-react";

interface AddonDefinition {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string;
  price_monthly: number;
  price_yearly: number;
  price_one_time: number | null;
  billing_type: "recurring" | "one_time" | "usage_based";
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface CompanyAddon {
  id: string;
  company_id: string;
  addon_id: string;
  status: string;
  quantity: number;
  price_paid: number | null;
  billing_cycle: string;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  companies: {
    name: string;
    email: string;
  };
  addon_definitions: {
    name: string;
    code: string;
  };
}

interface Company {
  id: string;
  name: string;
  email: string;
  subscription_tier: string;
}

export default function Addons() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("definitions");
  const [addons, setAddons] = useState<AddonDefinition[]>([]);
  const [companyAddons, setCompanyAddons] = useState<CompanyAddon[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isAddonDialogOpen, setIsAddonDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonDefinition | null>(null);

  // Form data for addon definition
  const [addonForm, setAddonForm] = useState({
    name: "",
    code: "",
    description: "",
    category: "feature",
    price_monthly: 0,
    price_yearly: 0,
    price_one_time: 0,
    billing_type: "recurring" as "recurring" | "one_time" | "usage_based",
    is_active: true,
    sort_order: 0,
  });

  // Form data for assigning addon to company
  const [assignForm, setAssignForm] = useState({
    company_id: "",
    addon_id: "",
    billing_cycle: "monthly",
    quantity: 1,
    auto_renew: true,
  });

  // Stats
  const [stats, setStats] = useState({
    totalAddons: 0,
    activeAssignments: 0,
    addonRevenue: 0,
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === "super_admin") {
      fetchAddons();
      fetchCompanyAddons();
      fetchCompanies();
    }
  }, [user, userRole]);

  const fetchAddons = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("addon_definitions")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setAddons(data || []);
      setStats(prev => ({ ...prev, totalAddons: data?.length || 0 }));
    } catch (error: any) {
      console.error("Error fetching addons:", error);
      // Don't show error toast if table doesn't exist yet
    } finally {
      setLoadingData(false);
    }
  };

  const fetchCompanyAddons = async () => {
    try {
      // Fetch companies with overdue invoices (defaulters)
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("company_id")
        .eq("status", "overdue");
      const defaulterCompanyIds = new Set(overdueInvoices?.map(i => i.company_id) || []);

      // Fetch companies that are not active or trial
      const { data: inactiveCompanies } = await supabase
        .from("companies")
        .select("id")
        .not("subscription_status", "in", '("active","trial")');
      const inactiveCompanyIds = new Set(inactiveCompanies?.map(c => c.id) || []);

      const { data, error } = await supabase
        .from("company_addons")
        .select(`
          *,
          companies:company_id(name, email),
          addon_definitions:addon_id(name, code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanyAddons(data || []);

      // Calculate stats (excluding defaulters and inactive companies)
      const activeCount = data?.filter(a => 
        a.status === "active" && 
        !defaulterCompanyIds.has(a.company_id) && 
        !inactiveCompanyIds.has(a.company_id)
      ).length || 0;

      const revenue = data?.reduce((sum, a) => {
        if (
          a.status === "active" && 
          a.price_paid && 
          !defaulterCompanyIds.has(a.company_id) && 
          !inactiveCompanyIds.has(a.company_id)
        ) {
          return sum + a.price_paid;
        }
        return sum;
      }, 0) || 0;

      setStats(prev => ({
        ...prev,
        activeAssignments: activeCount,
        addonRevenue: revenue,
      }));
    } catch (error: any) {
      console.error("Error fetching company addons:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, email, subscription_tier")
        .order("name", { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error("Error fetching companies:", error);
    }
  };

  const handleOpenAddonDialog = (addon?: AddonDefinition) => {
    if (addon) {
      setEditingAddon(addon);
      setAddonForm({
        name: addon.name,
        code: addon.code,
        description: addon.description || "",
        category: addon.category,
        price_monthly: addon.price_monthly,
        price_yearly: addon.price_yearly,
        price_one_time: addon.price_one_time || 0,
        billing_type: addon.billing_type,
        is_active: addon.is_active,
        sort_order: addon.sort_order,
      });
    } else {
      setEditingAddon(null);
      setAddonForm({
        name: "",
        code: "",
        description: "",
        category: "feature",
        price_monthly: 0,
        price_yearly: 0,
        price_one_time: 0,
        billing_type: "recurring",
        is_active: true,
        sort_order: addons.length + 1,
      });
    }
    setIsAddonDialogOpen(true);
  };

  const handleSaveAddon = async () => {
    try {
      const addonData = {
        name: addonForm.name,
        code: addonForm.code.toLowerCase().replace(/\s+/g, "_"),
        description: addonForm.description || null,
        category: addonForm.category,
        price_monthly: addonForm.price_monthly,
        price_yearly: addonForm.price_yearly,
        price_one_time: addonForm.billing_type === "one_time" ? addonForm.price_one_time : null,
        billing_type: addonForm.billing_type,
        is_active: addonForm.is_active,
        sort_order: addonForm.sort_order,
        updated_at: new Date().toISOString(),
      };

      if (editingAddon) {
        const { error } = await supabase
          .from("addon_definitions")
          .update(addonData)
          .eq("id", editingAddon.id);

        if (error) throw error;
        toast({ title: "Success", description: "Add-on updated successfully" });
      } else {
        const { error } = await supabase
          .from("addon_definitions")
          .insert(addonData);

        if (error) throw error;
        toast({ title: "Success", description: "Add-on created successfully" });
      }

      setIsAddonDialogOpen(false);
      fetchAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this add-on?")) return;

    try {
      const { error } = await supabase
        .from("addon_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Add-on deleted successfully" });
      fetchAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignAddon = async () => {
    try {
      const selectedAddon = addons.find(a => a.id === assignForm.addon_id);
      const price = assignForm.billing_cycle === "yearly" 
        ? selectedAddon?.price_yearly 
        : selectedAddon?.billing_type === "one_time"
          ? selectedAddon?.price_one_time
          : selectedAddon?.price_monthly;

      const { error } = await supabase
        .from("company_addons")
        .insert({
          company_id: assignForm.company_id,
          addon_id: assignForm.addon_id,
          billing_cycle: assignForm.billing_cycle,
          quantity: assignForm.quantity,
          price_paid: price,
          auto_renew: assignForm.auto_renew,
          status: "active",
          start_date: new Date().toISOString(),
          created_by: user?.id,
        });

      if (error) throw error;

      toast({ title: "Success", description: "Add-on assigned to company" });
      setIsAssignDialogOpen(false);
      fetchCompanyAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCompanyAddonStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("company_addons")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Add-on status updated" });
      fetchCompanyAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      feature: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      storage: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      support: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      integration: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filteredCompanyAddons = companyAddons.filter(ca =>
    ca.companies?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ca.addon_definitions?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h2 className="text-3xl font-bold mb-2">Add-ons Management</h2>
        <p className="text-muted-foreground">
          Create and manage add-on features for your subscription plans
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Add-ons</CardTitle>
            <Puzzle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAddons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeAssignments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Add-on Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{stats.addonRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="definitions">
            <Package className="w-4 h-4 mr-2" />
            Add-on Catalog
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Building2 className="w-4 h-4 mr-2" />
            Company Assignments
          </TabsTrigger>
        </TabsList>

        {/* Add-on Definitions Tab */}
        <TabsContent value="definitions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Add-on Catalog</CardTitle>
                <CardDescription>
                  Define available add-ons that companies can purchase
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenAddonDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Add-on
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Add-on</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Billing Type</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Yearly</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addons.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{addon.name}</div>
                          <div className="text-xs text-muted-foreground">{addon.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(addon.category)}>
                          {addon.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{addon.billing_type.replace("_", " ")}</TableCell>
                      <TableCell>
                        {addon.billing_type === "one_time" 
                          ? `€${addon.price_one_time}` 
                          : `€${addon.price_monthly}/mo`}
                      </TableCell>
                      <TableCell>
                        {addon.billing_type !== "one_time" && `€${addon.price_yearly}/yr`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={addon.is_active ? "default" : "secondary"}>
                          {addon.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenAddonDialog(addon)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAddon(addon.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {addons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No add-ons defined yet. Create your first add-on to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Company Add-on Assignments</CardTitle>
                <CardDescription>
                  Manage add-ons assigned to companies
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button onClick={() => setIsAssignDialogOpen(true)}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Assign Add-on
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Add-on</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanyAddons.map((ca) => (
                    <TableRow key={ca.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ca.companies?.name}</div>
                          <div className="text-xs text-muted-foreground">{ca.companies?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{ca.addon_definitions?.name}</TableCell>
                      <TableCell className="capitalize">{ca.billing_cycle}</TableCell>
                      <TableCell>€{ca.price_paid || 0}</TableCell>
                      <TableCell>
                        {new Date(ca.start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ca.status)}>
                          {ca.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={ca.status}
                          onValueChange={(value) => handleUpdateCompanyAddonStatus(ca.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="cancelled">Cancel</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCompanyAddons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No add-ons assigned to companies yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Add-on Dialog */}
      <Dialog open={isAddonDialogOpen} onOpenChange={setIsAddonDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAddon ? "Edit Add-on" : "Create New Add-on"}
            </DialogTitle>
            <DialogDescription>
              Configure the add-on details and pricing
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={addonForm.name}
                  onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                  placeholder="e.g., Priority Support"
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={addonForm.code}
                  onChange={(e) => setAddonForm({ ...addonForm, code: e.target.value })}
                  placeholder="e.g., priority_support"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={addonForm.description}
                onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                placeholder="Brief description of the add-on..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={addonForm.category}
                  onValueChange={(value) => setAddonForm({ ...addonForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Type</Label>
                <Select
                  value={addonForm.billing_type}
                  onValueChange={(value: any) => setAddonForm({ ...addonForm, billing_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="usage_based">Usage Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Monthly (€)</Label>
                <Input
                  type="number"
                  value={addonForm.price_monthly}
                  onChange={(e) => setAddonForm({ ...addonForm, price_monthly: parseFloat(e.target.value) || 0 })}
                  disabled={addonForm.billing_type === "one_time"}
                />
              </div>
              <div className="space-y-2">
                <Label>Yearly (€)</Label>
                <Input
                  type="number"
                  value={addonForm.price_yearly}
                  onChange={(e) => setAddonForm({ ...addonForm, price_yearly: parseFloat(e.target.value) || 0 })}
                  disabled={addonForm.billing_type === "one_time"}
                />
              </div>
              <div className="space-y-2">
                <Label>One-time (€)</Label>
                <Input
                  type="number"
                  value={addonForm.price_one_time}
                  onChange={(e) => setAddonForm({ ...addonForm, price_one_time: parseFloat(e.target.value) || 0 })}
                  disabled={addonForm.billing_type !== "one_time"}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={addonForm.is_active}
                onCheckedChange={(checked) => setAddonForm({ ...addonForm, is_active: checked })}
              />
              <Label>Add-on is active and available</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddon}>
              {editingAddon ? "Update" : "Create"} Add-on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Add-on to Company Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Add-on to Company</DialogTitle>
            <DialogDescription>
              Select a company and add-on to assign
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select
                value={assignForm.company_id}
                onValueChange={(value) => setAssignForm({ ...assignForm, company_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.subscription_tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Add-on</Label>
              <Select
                value={assignForm.addon_id}
                onValueChange={(value) => setAssignForm({ ...assignForm, addon_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an add-on..." />
                </SelectTrigger>
                <SelectContent>
                  {addons.filter(a => a.is_active).map((addon) => (
                    <SelectItem key={addon.id} value={addon.id}>
                      {addon.name} - €{addon.price_monthly}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select
                  value={assignForm.billing_cycle}
                  onValueChange={(value) => setAssignForm({ ...assignForm, billing_cycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={assignForm.quantity}
                  onChange={(e) => setAssignForm({ ...assignForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={assignForm.auto_renew}
                onCheckedChange={(checked) => setAssignForm({ ...assignForm, auto_renew: checked })}
              />
              <Label>Auto-renew when billing period ends</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignAddon}>
              Assign Add-on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
