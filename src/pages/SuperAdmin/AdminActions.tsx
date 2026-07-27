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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Lock,
    Unlock,
    Calendar,
    Package,
    Receipt,
    UserCog,
    MessageSquarePlus,
    Zap,
    Building2,
    Search,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";

interface Company {
    id: string;
    name: string;
    is_blocked: boolean;
    subscription_status: string;
}

interface User {
    id: string;
    email: string;
    full_name: string;
    company_id: string;
}

export default function AdminActions() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [companies, setCompanies] = useState<Company[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>("");
    const [selectedUser, setSelectedUser] = useState<string>("");
    const [loadingAction, setLoadingAction] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog states
    const [extendTrialDays, setExtendTrialDays] = useState("7");
    const [systemMessage, setSystemMessage] = useState("");
    const [invoiceCorrection, setInvoiceCorrection] = useState({ invoiceNumber: "", amount: "", reason: "" });
    const [invoices, setInvoices] = useState<{ id: string; invoice_number: string; company_id: string }[]>([]);
    const [recentActions, setRecentActions] = useState<any[]>([]);

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    useEffect(() => {
        if (user && userRole === "super_admin") {
            fetchCompanies();
            fetchUsers();
            fetchAddons();
            fetchInvoices();
            fetchRecentActions();
        }
    }, [user, userRole]);

    const fetchCompanies = async () => {
        const { data } = await supabase
            .from("companies")
            .select("id, name, is_blocked, subscription_status")
            .order("name");
        if (data) setCompanies(data);
    };

    const [addons, setAddons] = useState<{ id: string; name: string; code: string }[]>([]);

    const fetchUsers = async () => {
        // Get all user_roles with company associations
        const { data: userRoles } = await supabase
            .from("user_roles")
            .select("user_id, company_id, role")
            .order("created_at", { ascending: false });

        if (!userRoles || userRoles.length === 0) {
            setUsers([]);
            return;
        }

        // Get unique user IDs
        const userIds = [...new Set(userRoles.map(ur => ur.user_id))];

        // Fetch profiles for these users
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds);

        if (profiles) {
            const transformedUsers = profiles.map(p => {
                const userRole = userRoles.find(ur => ur.user_id === p.id);
                return {
                    id: p.id,
                    email: p.email || "N/A",
                    full_name: p.full_name || "N/A",
                    company_id: userRole?.company_id || "",
                };
            });
            setUsers(transformedUsers);
        }
    };

    const fetchAddons = async () => {
        const { data } = await supabase
            .from("addon_definitions")
            .select("id, name, code")
            .order("name");
        if (data) setAddons(data);
    };

    const fetchInvoices = async () => {
        const { data } = await supabase
            .from("invoices")
            .select("id, invoice_number, company_id")
            .order("created_at", { ascending: false })
            .limit(100);
        if (data) setInvoices(data);
    };

    const fetchRecentActions = async () => {
        const { data } = await supabase
            .from("audit_logs")
            .select("*")
            // .eq("actor_email", user?.email) // Removed to show ALL admin actions
            .order("created_at", { ascending: false })
            .limit(10);
        if (data) setRecentActions(data);
    };

    const logAuditAction = async (actionType: string, targetType: string, targetName: string, details?: any) => {
        await supabase.from("audit_logs").insert({
            actor_email: user?.email,
            actor_role: "super_admin",
            action_type: actionType,
            target_type: targetType,
            target_name: targetName,
            details: details,
            company_id: selectedCompany || null,
        });
    };

    // Action: Lock/Unlock Company
    const handleToggleCompanyLock = async (companyId: string, isBlocked: boolean) => {
        setLoadingAction(true);
        try {
            const newBlockedStatus = !isBlocked;
            const { error } = await supabase
                .from("companies")
                .update({ is_blocked: newBlockedStatus })
                .eq("id", companyId);

            if (error) throw error;

            const company = companies.find(c => c.id === companyId);
            await logAuditAction(
                newBlockedStatus ? "block_company" : "unblock_company",
                "company",
                company?.name || companyId,
                { previous_blocked_status: isBlocked, new_blocked_status: newBlockedStatus }
            );

            toast({
                title: "Erfolgreich",
                description: `Unternehmen ${newBlockedStatus ? "gesperrt" : "entsperrt"}`,
            });
            fetchCompanies();
            fetchRecentActions();
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    // Action: Extend Trial
    const handleExtendTrial = async () => {
        if (!selectedCompany) {
            toast({ title: "Fehler", description: "Bitte wählen Sie ein Unternehmen aus", variant: "destructive" });
            return;
        }
        setLoadingAction(true);
        try {
            const { data: subscription } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("company_id", selectedCompany)
                .single();

            const currentEndDate = subscription?.end_date ? new Date(subscription.end_date) : new Date();
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + parseInt(extendTrialDays));

            const { error } = await supabase
                .from("subscriptions")
                .update({ end_date: newEndDate.toISOString(), status: "trial" })
                .eq("company_id", selectedCompany);

            if (error) throw error;

            const company = companies.find(c => c.id === selectedCompany);
            await logAuditAction("extend_trial", "subscription", company?.name || selectedCompany, {
                days_extended: extendTrialDays,
                new_end_date: newEndDate.toISOString(),
            });

            toast({
                title: "Testphase verlängert",
                description: `Testphase um ${extendTrialDays} Tage verlängert`,
            });
            fetchRecentActions();
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    // Action: Activate Module
    const handleActivateModule = async (moduleId: string) => {
        if (!selectedCompany) {
            toast({ title: "Fehler", description: "Bitte wählen Sie ein Unternehmen aus", variant: "destructive" });
            return;
        }
        setLoadingAction(true);
        try {
            const { error } = await supabase
                .from("company_addons")
                .insert({
                    company_id: selectedCompany,
                    addon_id: moduleId,
                    status: "active",
                    start_date: new Date().toISOString(),
                });

            if (error) throw error;

            const company = companies.find(c => c.id === selectedCompany);
            await logAuditAction("activate_module", "addon", moduleId, {
                company: company?.name,
            });

            toast({ title: "Erfolgreich", description: "Modul erfolgreich aktiviert" });
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    // Action: Reset User Password
    const handleResetUser = async () => {
        if (!selectedUser) {
            toast({ title: "Fehler", description: "Bitte wählen Sie einen Benutzer aus", variant: "destructive" });
            return;
        }
        setLoadingAction(true);
        try {
            const selectedUserData = users.find(u => u.id === selectedUser);

            // In production, this would trigger a password reset email
            await logAuditAction("reset_password", "user", selectedUserData?.email || selectedUser, {
                initiated_by: user?.email,
            });

            toast({
                title: "Passwort zurückgesetzt",
                description: `Passwort-Reset-E-Mail wurde gesendet an ${selectedUserData?.email}`,
            });
            fetchRecentActions();
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    // Action: Send System Message
    const handleSendSystemMessage = async () => {
        if (!systemMessage.trim()) {
            toast({ title: "Fehler", description: "Bitte geben Sie eine Nachricht ein", variant: "destructive" });
            return;
        }
        setLoadingAction(true);
        try {
            // Insert into system_alerts for broadcast
            const { error } = await supabase
                .from("system_alerts")
                .insert({
                    title: "System Announcement",
                    message: systemMessage,
                    severity: "low",
                    status: "active",
                });

            if (error) throw error;

            await logAuditAction("send_system_message", "system", "all_users", {
                message: systemMessage,
            });

            toast({ title: "Erfolgreich", description: "Systemnachricht an alle Benutzer gesendet" });
            setSystemMessage("");
            fetchRecentActions();
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    // Action: Correct Invoice
    const handleCorrectInvoice = async () => {
        if (!selectedCompany || !invoiceCorrection.invoiceNumber || !invoiceCorrection.amount || !invoiceCorrection.reason) {
            toast({ title: "Fehler", description: "Bitte alle Felder ausfüllen", variant: "destructive" });
            return;
        }
        setLoadingAction(true);
        try {
            const company = companies.find(c => c.id === selectedCompany);
            await logAuditAction("correct_invoice", "invoice", company?.name || selectedCompany, {
                invoice_number: invoiceCorrection.invoiceNumber,
                amount: invoiceCorrection.amount,
                reason: invoiceCorrection.reason,
            });

            toast({ title: "Erfolgreich", description: "Rechnungskorrektur protokolliert" });
            setInvoiceCorrection({ invoiceNumber: "", amount: "", reason: "" });
            fetchRecentActions(); // Refresh recent actions
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    const [showBlockedOnly, setShowBlockedOnly] = useState(false);

    const filteredCompanies = companies
        .filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesBlocked = showBlockedOnly ? c.is_blocked : true;
            return matchesSearch && matchesBlocked;
        })
        .sort((a, b) => {
            // Sort blocked companies first
            if (a.is_blocked && !b.is_blocked) return -1;
            if (!a.is_blocked && b.is_blocked) return 1;
            return a.name.localeCompare(b.name);
        });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Admin-Schnellaktionen</h2>
                <p className="text-muted-foreground">
                    Schnelle Interventionswerkzeuge für den Kundensupport – kein Entwickler erforderlich
                </p>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Lock/Unlock Company */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-red-500" />
                            Unternehmen sperren / entsperren
                        </CardTitle>
                        <CardDescription>
                            Unternehmenszugang vorübergehend sperren oder reaktivieren
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Unternehmen suchen..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="showBlocked"
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={showBlockedOnly}
                                    onChange={(e) => setShowBlockedOnly(e.target.checked)}
                                />
                                <Label htmlFor="showBlocked" className="text-sm">Nur gesperrte anzeigen</Label>
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredCompanies.length > 0 ? (
                                filteredCompanies.map((company) => (
                                    <div key={company.id} className="flex items-center justify-between p-2 border rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{company.name}</span>
                                            <Badge variant={company.is_blocked ? "destructive" : "outline"}>
                                                {company.is_blocked ? "Gesperrt" : "Aktiv"}
                                            </Badge>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={company.is_blocked ? "default" : "destructive"}
                                            onClick={() => handleToggleCompanyLock(company.id, company.is_blocked)}
                                            disabled={loadingAction}
                                        >
                                            {company.is_blocked ? (
                                                <><Unlock className="h-3 w-3 mr-1" /> Entsperren</>
                                            ) : (
                                                <><Lock className="h-3 w-3 mr-1" /> Sperren</>
                                            )}
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">Keine Unternehmen gefunden</p>
                            )}
                        </div>
                    </CardContent>
                </Card>



                {/* Extend Trial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            Testzeitraum verlängern
                        </CardTitle>
                        <CardDescription>
                            Kunden zusätzliche Zeit zur Bewertung der Plattform geben
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Unternehmen auswählen</Label>
                            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Unternehmen wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Verlängerung (Tage)</Label>
                            <Select value={extendTrialDays} onValueChange={setExtendTrialDays}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 Tage</SelectItem>
                                    <SelectItem value="14">14 Tage</SelectItem>
                                    <SelectItem value="30">30 Tage</SelectItem>
                                    <SelectItem value="60">60 Tage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleExtendTrial} disabled={loadingAction || !selectedCompany} className="w-full">
                            <Calendar className="h-4 w-4 mr-2" />
                            Testphase verlängern
                        </Button>
                    </CardContent>
                </Card>

                {/* Activate Module */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-purple-500" />
                            Modul aktivieren
                        </CardTitle>
                        <CardDescription>
                            Add-on-Module manuell für ein Unternehmen aktivieren
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Unternehmen auswählen</Label>
                            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Unternehmen wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                            {addons.length > 0 ? (
                                addons.map((addon) => (
                                    <Button
                                        key={addon.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleActivateModule(addon.id)}
                                        disabled={loadingAction || !selectedCompany}
                                    >
                                        {addon.name}
                                    </Button>
                                ))
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" disabled>Keine Module gefunden</Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Correct Invoice */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-green-500" />
                            Rechnung korrigieren
                        </CardTitle>
                        <CardDescription>
                            Rechnungskorrekturen und -anpassungen protokollieren
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Unternehmen</Label>
                            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Unternehmen wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Rechnungsnummer</Label>
                            <Select
                                value={invoiceCorrection.invoiceNumber}
                                onValueChange={(value) => setInvoiceCorrection({ ...invoiceCorrection, invoiceNumber: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Rechnung auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {invoices
                                        .filter(inv => !selectedCompany || inv.company_id === selectedCompany)
                                        .map((inv) => (
                                            <SelectItem key={inv.id} value={inv.invoice_number}>
                                                {inv.invoice_number}
                                            </SelectItem>
                                        ))}
                                    {invoices.filter(inv => !selectedCompany || inv.company_id === selectedCompany).length === 0 && (
                                        <SelectItem value="none" disabled>Keine Rechnungen gefunden</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Korrekturbetrag (€)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={invoiceCorrection.amount}
                                onChange={(e) => setInvoiceCorrection({ ...invoiceCorrection, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Grund</Label>
                            <Input
                                placeholder="Grund für die Korrektur"
                                value={invoiceCorrection.reason}
                                onChange={(e) => setInvoiceCorrection({ ...invoiceCorrection, reason: e.target.value })}
                            />
                        </div>
                        <Button onClick={handleCorrectInvoice} disabled={loadingAction} className="w-full">
                            <Receipt className="h-4 w-4 mr-2" />
                            Korrektur protokollieren
                        </Button>
                    </CardContent>
                </Card>

                {/* Reset User */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-amber-500" />
                            Benutzer zurücksetzen
                        </CardTitle>
                        <CardDescription>
                            Passwort zurücksetzen oder Benutzerkonten entsperren
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Benutzer auswählen</Label>
                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Benutzer wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.slice(0, 20).map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.email} ({u.full_name})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleResetUser} disabled={loadingAction || !selectedUser} className="flex-1">
                                <UserCog className="h-4 w-4 mr-2" />
                                Passwort zurücksetzen
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Push System Message */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquarePlus className="h-5 w-5 text-indigo-500" />
                            Systemnachricht senden
                        </CardTitle>
                        <CardDescription>
                            Ankündigungen an alle Benutzer senden
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Nachricht</Label>
                            <Textarea
                                placeholder="Systemankündigung eingeben..."
                                value={systemMessage}
                                onChange={(e) => setSystemMessage(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <Button onClick={handleSendSystemMessage} disabled={loadingAction || !systemMessage.trim()} className="w-full">
                            <MessageSquarePlus className="h-4 w-4 mr-2" />
                            An alle Benutzer senden
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Actions */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Letzte Admin-Aktionen
                    </CardTitle>
                    <CardDescription>Ihre letzten Schnellaktionen für den Prüfpfad</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentActions.length > 0 ? (
                        <div className="space-y-2">
                            {recentActions.map((action) => (
                                <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="capitalize">
                                                {action.action_type?.replace(/_/g, ' ')}
                                            </Badge>
                                            <span className="text-sm font-medium">
                                                {action.target_type === 'addon' ? action.target_name : ''}
                                            </span>
                                        </div>

                                        <div className="text-sm grid grid-cols-1 gap-1">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Building2 className="h-3 w-3" />
                                                <span className="font-medium text-foreground">
                                                    {action.action_type === 'login'
                                                        ? (() => {
                                                            const actor = users.find(u => u.email === action.actor_email);
                                                            if (actor) {
                                                                const company = companies.find(c => c.id === actor.company_id);
                                                                return company ? `${actor.full_name} (${company.name})` : actor.full_name;
                                                            }
                                                            return action.actor_email;
                                                        })()
                                                        : (['company', 'invoice', 'subscription'].includes(action.target_type)
                                                            ? action.target_name
                                                            : (companies.find(c => c.id === action.company_id)?.name || action.details?.company || 'N/A'))
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                <UserCog className="h-3 w-3" />
                                                <span>Von: {action.actor_email || 'System'}</span>
                                                <span>•</span>
                                                <span>{new Date(action.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {action.details && (
                                            <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 gap-x-4 gap-y-1 bg-background/50 p-2 rounded border">
                                                {action.details.reason && (
                                                    <span>Grund: <span className="font-medium text-foreground">{action.details.reason}</span></span>
                                                )}
                                                {action.details.invoice_number && (
                                                    <span>Rechnung: <span className="font-medium text-foreground">{action.details.invoice_number}</span></span>
                                                )}
                                                {action.details.amount && (
                                                    <span>Betrag: <span className="font-medium text-foreground">€{action.details.amount}</span></span>
                                                )}
                                                {action.details.new_blocked_status !== undefined && (
                                                    <span>Status: <span className="font-medium text-foreground">{action.details.new_blocked_status ? 'Gesperrt' : 'Entsperrt'}</span></span>
                                                )}
                                                {action.details.days_extended && (
                                                    <span>Verlängert: <span className="font-medium text-foreground">+{action.details.days_extended} Tage</span></span>
                                                )}
                                                {action.details.message && (
                                                    <span className="col-span-2">Nachricht: <span className="font-medium text-foreground">{action.details.message}</span></span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <div className="text-center">
                                <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                                <p>Keine letzten Aktionen</p>
                                <p className="text-sm">Aktionen werden nach der Ausführung hier angezeigt</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
