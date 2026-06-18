import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface NewSystemForm {
  name: string;
  type: string;
  endpoint: string;
}

interface ApiIntegrationTabProps {
  apiToken: string | null;
  showApiToken: boolean;
  setShowApiToken: React.Dispatch<React.SetStateAction<boolean>>;
  isGeneratingToken: boolean;
  externalSystems: any[];
  isAddSystemDialogOpen: boolean;
  setIsAddSystemDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newSystemForm: NewSystemForm;
  setNewSystemForm: React.Dispatch<React.SetStateAction<NewSystemForm>>;
  isAddingSystem: boolean;
  generateApiToken: () => void;
  copyApiToken: () => void;
  addExternalSystem: () => void;
  deleteExternalSystem: (systemId: string, systemName: string) => void;
  testExternalSystem: (system: any) => void;
}

export function ApiIntegrationTab({
  apiToken,
  showApiToken,
  setShowApiToken,
  isGeneratingToken,
  externalSystems,
  isAddSystemDialogOpen,
  setIsAddSystemDialogOpen,
  newSystemForm,
  setNewSystemForm,
  isAddingSystem,
  generateApiToken,
  copyApiToken,
  addExternalSystem,
  deleteExternalSystem,
  testExternalSystem,
}: ApiIntegrationTabProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="w-5 h-5" />
          {t("settings.apiIntegration")}
        </CardTitle>
        <CardDescription>
          {t("settings.apiIntegrationDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-token">
                {t("settings.apiToken")}
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="api-token"
                  type={showApiToken ? "text" : "password"}
                  value={apiToken || "••••••••••••••••••••••••••••••••"}
                  readOnly
                  className="font-mono"
                />
                {apiToken && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiToken(!showApiToken)}
                    >
                      {showApiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyApiToken}
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={generateApiToken}
                  disabled={isGeneratingToken}
                >
                  {isGeneratingToken ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {t("settings.generateNewToken")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings.apiTokenDesc")}
              </p>
            </div>

            <div>
              <Label>{t("settings.apiDocumentation")}</Label>
              <div className="p-4 border rounded-lg mt-2">
                <p className="text-sm mb-2">
                  {t("settings.baseUrl")}{" "}
                  <code className="bg-muted px-2 py-1 rounded">
                    https://api.safe-forward.de/v1
                  </code>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.apiDocsDesc")}
                </p>
                <Button
                  variant="link"
                  className="px-0 mt-2"
                  onClick={() => window.open('https://docs.safe-forward.de/api', '_blank')}
                >
                  {t("settings.viewApiDocs")} →
                </Button>
              </div>
            </div>

            <div>
              <Label>{t("settings.connectedSystems")}</Label>
              <div className="rounded-md border mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("settings.systemName")}
                      </TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>
                        {t("settings.lastSync")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {externalSystems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {t("settings.noSystemsConnected")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      externalSystems.map((system) => (
                        <TableRow key={system.id}>
                          <TableCell className="font-medium">
                            {system.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({system.system_type})
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={system.status === 'active' ? "default" : "secondary"}>
                              {system.status === 'active' ? "Active" : system.status === 'error' ? 'Error' : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {system.last_sync_at
                              ? new Date(system.last_sync_at).toLocaleString()
                              : "Never"
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteExternalSystem(system.id, system.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Connect external systems via webhooks or REST APIs
              </p>
              <div className="flex gap-2">
                <Dialog open={isAddSystemDialogOpen} onOpenChange={setIsAddSystemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Connect System
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect External System</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="system-name">System Name *</Label>
                        <Input
                          id="system-name"
                          placeholder="e.g., SAP HR, Salesforce"
                          value={newSystemForm.name}
                          onChange={(e) => setNewSystemForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="system-type">System Type</Label>
                        <Select
                          value={newSystemForm.type}
                          onValueChange={(value) => setNewSystemForm(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="webhook">Webhook</SelectItem>
                            <SelectItem value="rest_api">REST API</SelectItem>
                            <SelectItem value="erp">ERP System</SelectItem>
                            <SelectItem value="sap">SAP</SelectItem>
                            <SelectItem value="oracle">Oracle ERP</SelectItem>
                            <SelectItem value="quickbooks">QuickBooks</SelectItem>
                            <SelectItem value="sftp">SFTP</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="system-endpoint">Endpoint URL *</Label>
                        <Input
                          id="system-endpoint"
                          placeholder="https://api.example.com/webhook"
                          value={newSystemForm.endpoint}
                          onChange={(e) => setNewSystemForm(prev => ({ ...prev, endpoint: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddSystemDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addExternalSystem} disabled={isAddingSystem}>
                        {isAddingSystem ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Add System
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
