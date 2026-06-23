import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Shield,
  Settings,
  FileText,
  ClipboardList,
  BarChart3,
  Heart,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Bell,
  GraduationCap,
  AlertTriangle,
  Siren,
  Wrench,
  Stethoscope,
  Lock,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DetailedPermissions,
  PermissionCategory,
  PERMISSION_CATEGORIES,
  PERMISSION_DEFINITIONS,
  DEFAULT_DETAILED_PERMISSIONS,
  CustomRole,
  isPredefinedRole,
} from "@/types/permissions";

interface RolePermissionEditorProps {
  roles: CustomRole[];
  selectedRole: CustomRole | null;
  onSelectRole: (role: CustomRole) => void;
  onUpdatePermission: (
    roleName: string,
    category: PermissionCategory,
    permission: string,
    value: boolean
  ) => Promise<void>;
  onCreateRole: (name: string, description: string) => Promise<void>;
  onDeleteRole: (roleName: string) => Promise<void>;
  onUpdateRoleDescription: (roleName: string, description: string) => Promise<void>;
  isLoading?: boolean;
}

const CATEGORY_ICONS: Record<PermissionCategory, React.ReactNode> = {
  standard: <Users className="w-4 h-4" />,
  employees: <Users className="w-4 h-4" />,
  health_examinations: <Heart className="w-4 h-4" />,
  investigations: <Stethoscope className="w-4 h-4" />,
  documents: <FileText className="w-4 h-4" />,
  trainings: <GraduationCap className="w-4 h-4" />,
  risk_assessments: <AlertTriangle className="w-4 h-4" />,
  incidents: <Siren className="w-4 h-4" />,
  measures: <Wrench className="w-4 h-4" />,
  audits: <ClipboardList className="w-4 h-4" />,
  reports: <BarChart3 className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
};

export function RolePermissionEditor({
  roles,
  selectedRole,
  onSelectRole,
  onUpdatePermission,
  onCreateRole,
  onDeleteRole,
  onUpdateRoleDescription,
  isLoading = false,
}: RolePermissionEditorProps) {
  const { t, language } = useLanguage();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateRole(newRoleName.trim(), newRoleDescription.trim());
      setNewRoleName("");
      setNewRoleDescription("");
      setIsCreateDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!selectedRole) return;
    await onUpdateRoleDescription(selectedRole.role_name, editedDescription);
    setIsEditingDescription(false);
  };

  const getPermissionLabel = (category: PermissionCategory, key: string): string => {
    const def = PERMISSION_DEFINITIONS[category]?.[key];
    if (!def) return key;
    return language === "de" ? def.labelDe : def.label;
  };

  const getPermissionDescription = (category: PermissionCategory, key: string): string => {
    const def = PERMISSION_DEFINITIONS[category]?.[key];
    if (!def) return "";
    return language === "de" ? def.descriptionDe : def.description;
  };

  const getCategoryLabel = (category: PermissionCategory): string => {
    const cat = PERMISSION_CATEGORIES[category];
    return language === "de" ? cat.labelDe : cat.label;
  };

  const getCategoryDescription = (category: PermissionCategory): string => {
    const cat = PERMISSION_CATEGORIES[category];
    return language === "de" ? cat.descriptionDe : cat.description;
  };

  const countActivePermissions = (role: CustomRole): number => {
    const detailed = role.detailed_permissions || DEFAULT_DETAILED_PERMISSIONS;
    let count = 0;
    Object.values(detailed).forEach((categoryPerms) => {
      Object.values(categoryPerms).forEach((value) => {
        if (value === true) count++;
      });
    });
    return count;
  };

  const getTotalPermissions = (): number => {
    let count = 0;
    Object.values(PERMISSION_DEFINITIONS).forEach((category) => {
      count += Object.keys(category).length;
    });
    return count;
  };

  const isAdminFixed = (role: CustomRole | null): boolean =>
    role?.role_name === "Admin";

  const renderPermissionCategory = (category: PermissionCategory) => {
    if (!selectedRole) return null;

    const adminFixed = isAdminFixed(selectedRole);
    const detailed = selectedRole.detailed_permissions || DEFAULT_DETAILED_PERMISSIONS;
    const categoryPerms = detailed[category] || {};
    const permissionKeys = Object.keys(PERMISSION_DEFINITIONS[category] || {});

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          {CATEGORY_ICONS[category]}
          <div>
            <h3 className="font-semibold">{getCategoryLabel(category)}</h3>
            <p className="text-sm text-muted-foreground">{getCategoryDescription(category)}</p>
          </div>
        </div>
        <div className="space-y-3">
          {permissionKeys.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <Label htmlFor={`${category}-${key}`} className="font-medium cursor-pointer">
                  {getPermissionLabel(category, key)}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getPermissionDescription(category, key)}
                </p>
              </div>
              <Switch
                id={`${category}-${key}`}
                checked={adminFixed ? true : (categoryPerms as Record<string, boolean>)[key] === true}
                onCheckedChange={(checked) =>
                  onUpdatePermission(selectedRole.role_name, category, key, checked)
                }
                disabled={isLoading || adminFixed}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-300px)] min-h-[600px]">
      {/* Left Panel: Role List */}
      <Card className="w-80 flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {language === "de" ? "Benutzerrollen" : "User Roles"}
            </CardTitle>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {language === "de" ? "Neue Rolle" : "New Role"}
            </Button>
          </div>
          <CardDescription>
            {language === "de"
              ? "Rollen definieren und Zugriffsberechtigungen im System festlegen"
              : "Define roles and set access permissions in the system"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100%-120px)]">
            <div className="p-2 space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => onSelectRole(role)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedRole?.id === role.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{role.role_name}</span>
                    {role.is_predefined && (
                      <Badge
                        variant={selectedRole?.id === role.id ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {language === "de" ? "Vordefiniert" : "Predefined"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-xs ${
                        selectedRole?.id === role.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {countActivePermissions(role)} / {getTotalPermissions()}{" "}
                      {language === "de" ? "Berechtigungen" : "permissions"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel: Permission Editor */}
      <Card className="flex-1">
        {selectedRole ? (
          <>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{selectedRole.role_name}</CardTitle>
                    {selectedRole.is_predefined && (
                      <Badge variant="secondary">
                        {language === "de" ? "Vordefiniert" : "Predefined"}
                      </Badge>
                    )}
                    {isAdminFixed(selectedRole) && (
                      <Badge variant="default" className="gap-1">
                        <Lock className="w-3 h-3" />
                        {language === "de" ? "Alle Rechte fix" : "All permissions fixed"}
                      </Badge>
                    )}
                  </div>
                  {isEditingDescription ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder={
                          language === "de" ? "Beschreibung eingeben..." : "Enter description..."
                        }
                        className="flex-1"
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveDescription}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingDescription(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <CardDescription
                      className="cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => {
                        setEditedDescription(selectedRole.description || "");
                        setIsEditingDescription(true);
                      }}
                    >
                      {selectedRole.description || (
                        <span className="italic">
                          {language === "de"
                            ? "Klicken um Beschreibung hinzuzufügen..."
                            : "Click to add description..."}
                        </span>
                      )}
                      <Pencil className="w-3 h-3 inline ml-1 opacity-50" />
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Bell className="w-4 h-4 mr-1" />
                    {language === "de" ? "Benachrichtigungen" : "Notifications"}
                  </Button>
                  {!selectedRole.is_predefined && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteRole(selectedRole.role_name)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {language === "de" ? "Löschen" : "Delete"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex-wrap h-auto">
                  <TabsTrigger value="general">
                    {language === "de" ? "Allgemein" : "General"}
                  </TabsTrigger>
                  <TabsTrigger value="health">
                    {language === "de" ? "Gesundheit" : "Health"}
                  </TabsTrigger>
                  <TabsTrigger value="operations">
                    {language === "de" ? "Betrieb" : "Operations"}
                  </TabsTrigger>
                  <TabsTrigger value="workflow">
                    {language === "de" ? "Audits & Berichte" : "Audits & Reports"}
                  </TabsTrigger>
                  <TabsTrigger value="company">
                    {language === "de" ? "Unternehmen" : "Company"}
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px] pr-4">
                  <TabsContent value="general" className="mt-0 space-y-6">
                    {/* High-level data access info */}
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">
                            {language === "de" ? "Datenzugriffsebene" : "Data Access Level"}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {language === "de"
                              ? "Diese Rolle hat Zugriff auf die unten konfigurierten Berechtigungen. Nur Administratoren können andere Administratoren löschen und haben Zugriff auf alle Daten."
                              : "This role has access to the permissions configured below. Only administrators can delete other administrators and have access to all data."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Standard Permissions */}
                    {renderPermissionCategory("standard")}

                    <Separator />

                    {/* Employee Permissions */}
                    {renderPermissionCategory("employees")}
                  </TabsContent>

                  <TabsContent value="health" className="mt-0 space-y-6">
                    {/* Health Examinations (employee profile) */}
                    {renderPermissionCategory("health_examinations")}

                    <Separator />

                    {/* Investigations (G-Untersuchungen) */}
                    {renderPermissionCategory("investigations")}
                  </TabsContent>

                  <TabsContent value="operations" className="mt-0 space-y-6">
                    {/* Trainings */}
                    {renderPermissionCategory("trainings")}

                    <Separator />

                    {/* Risk Assessments */}
                    {renderPermissionCategory("risk_assessments")}

                    <Separator />

                    {/* Incidents */}
                    {renderPermissionCategory("incidents")}

                    <Separator />

                    {/* Measures */}
                    {renderPermissionCategory("measures")}
                  </TabsContent>

                  <TabsContent value="workflow" className="mt-0 space-y-6">
                    {/* Audits */}
                    {renderPermissionCategory("audits")}

                    <Separator />

                    {/* Reports */}
                    {renderPermissionCategory("reports")}

                    <Separator />

                    {/* Documents */}
                    {renderPermissionCategory("documents")}
                  </TabsContent>

                  <TabsContent value="company" className="mt-0 space-y-6">
                    {/* Settings */}
                    {renderPermissionCategory("settings")}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                {language === "de"
                  ? "Wählen Sie eine Rolle aus, um die Berechtigungen zu bearbeiten"
                  : "Select a role to edit permissions"}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "de" ? "Neue Rolle erstellen" : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              {language === "de"
                ? "Erstellen Sie eine neue benutzerdefinierte Rolle mit individuellen Berechtigungen."
                : "Create a new custom role with individual permissions."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">
                {language === "de" ? "Rollenname" : "Role Name"}
              </Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder={
                  language === "de" ? "z.B. Projektleiter" : "e.g. Project Manager"
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">
                {language === "de" ? "Beschreibung" : "Description"}
              </Label>
              <Textarea
                id="roleDescription"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder={
                  language === "de"
                    ? "Beschreiben Sie die Rolle und ihre Verantwortlichkeiten..."
                    : "Describe the role and its responsibilities..."
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {language === "de" ? "Abbrechen" : "Cancel"}
            </Button>
            <Button onClick={handleCreateRole} disabled={!newRoleName.trim() || isCreating}>
              {isCreating
                ? language === "de"
                  ? "Erstellen..."
                  : "Creating..."
                : language === "de"
                ? "Rolle erstellen"
                : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RolePermissionEditor;
