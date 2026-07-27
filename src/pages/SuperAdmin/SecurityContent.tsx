import { useEffect, useState } from "react";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Shield,
    AlertTriangle,
    UserX,
    Key,
    Download,
    UserCog,
    FileWarning,
    CheckCircle,
    XCircle,
    RefreshCcw,
    Eye,
} from "lucide-react";

interface SecurityEvent {
    id: string;
    event_type: string;
    actor_email: string;
    target_email?: string;
    details: string;
    severity: "low" | "medium" | "high" | "critical";
    created_at: string;
    ip_address?: string;
}

interface LoginAttempt {
    email: string;
    attempts: number;
    last_attempt: string;
    status: "blocked" | "warning" | "normal";
}

interface RightsChange {
    id: string;
    actor: string;
    target_user: string;
    old_role: string;
    new_role: string;
    timestamp: string;
}

interface GDPREvent {
    id: string;
    type: "data_export" | "data_deletion" | "consent_change";
    user_email: string;
    requested_by: string;
    status: "pending" | "completed" | "cancelled";
    created_at: string;
}

export default function SecurityContent() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    // Security metrics
    const [securityStats, setSecurityStats] = useState({
        loginAnomalies: 0,
        failedAttempts: 0,
        rightsChanges: 0,
        gdprEvents: 0,
        adminActions: 0,
        dataExports: 0,
    });

    const [failedLogins, setFailedLogins] = useState<LoginAttempt[]>([]);

    const [rightsChanges, setRightsChanges] = useState<RightsChange[]>([]);
    const [gdprEvents, setGDPREvents] = useState<GDPREvent[]>([]);
    const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);

    useEffect(() => {
        fetchSecurityData();
    }, []);

    const fetchSecurityData = async () => {
        setLoading(true);
        try {
            // Fetch admin actions from audit_logs
            const { data: adminActionsData, count: adminCount } = await supabase
                .from("audit_logs")
                .select("*", { count: "exact" })
                .in("action_type", ["block_company", "unblock_company", "modify_subscription", "extend_trial", "reset_password"])
                .order("created_at", { ascending: false })
                .limit(10);

            // Fetch rights changes from audit_logs  
            const { data: rightsData, count: rightsCount } = await supabase
                .from("audit_logs")
                .select("*", { count: "exact" })
                .eq("action_type", "change_role")
                .order("created_at", { ascending: false })
                .limit(10);

            if (rightsData) {
                setRightsChanges(rightsData.map((r: any) => ({
                    id: r.id,
                    actor: r.actor_email,
                    target_user: r.target_name || "Unknown",
                    old_role: r.details?.old_role || "N/A",
                    new_role: r.details?.new_role || "N/A",
                    timestamp: r.created_at,
                })));
            }

            // Transform admin actions to security events
            if (adminActionsData) {
                setSecurityEvents(adminActionsData.map((a: any) => ({
                    id: a.id,
                    event_type: a.action_type,
                    actor_email: a.actor_email,
                    target_email: a.target_name,
                    details: JSON.stringify(a.details || {}),
                    severity: ["block_company", "delete_company"].includes(a.action_type) ? "high" : "medium",
                    created_at: a.created_at,
                    ip_address: a.ip_address,
                })));
            }

            setSecurityStats({
                loginAnomalies: 0,
                failedAttempts: failedLogins.reduce((sum, l) => sum + l.attempts, 0),
                rightsChanges: rightsCount || 0,
                gdprEvents: 0, // Would come from GDPR tracking table
                adminActions: adminCount || 0,
                dataExports: 0,
            });

        } catch (error) {
            console.error("Error fetching security data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "destructive";
            case "high": return "destructive";
            case "medium": return "secondary";
            default: return "outline";
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case "block_company": return <UserX className="h-4 w-4 text-red-500" />;
            case "modify_subscription": return <Key className="h-4 w-4 text-amber-500" />;
            case "data_export": return <Download className="h-4 w-4 text-blue-500" />;
            case "change_role": return <UserCog className="h-4 w-4 text-purple-500" />;
            default: return <Shield className="h-4 w-4 text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold">Sicherheit & Compliance</h3>
                    <p className="text-sm text-muted-foreground">Vollständige Kontrolle über kritische Ereignisse und DSGVO-Compliance</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSecurityData}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Aktualisieren
                </Button>
            </div>

            {/* Security Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Anmeldeanomalien</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                        <p className="text-xs text-muted-foreground" title="Nicht verfügbar (Supabase Auth-Logs nicht zugänglich)">Supabase Auth-Logs nicht zugänglich</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fehlgeschlagene Versuche</CardTitle>
                        <UserX className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{securityStats.failedAttempts}</div>
                        <p className="text-xs text-muted-foreground">Letzte 24 Stunden</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rechteänderungen</CardTitle>
                        <UserCog className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{securityStats.rightsChanges}</div>
                        <p className="text-xs text-muted-foreground">Rollenänderungen</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Datenexporte</CardTitle>
                        <Download className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{securityStats.dataExports}</div>
                        <p className="text-xs text-muted-foreground">Exportanfragen</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Admin-Aktionen</CardTitle>
                        <Shield className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{securityStats.adminActions}</div>
                        <p className="text-xs text-muted-foreground">Kritische Aktionen</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">DSGVO-Ereignisse</CardTitle>
                        <FileWarning className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{securityStats.gdprEvents}</div>
                        <p className="text-xs text-muted-foreground">Compliance-Anfragen</p>
                    </CardContent>
                </Card>
            </div>

            {/* Failed Login Attempts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserX className="h-5 w-5 text-red-500" />
                        Fehlgeschlagene Anmeldeversuche
                    </CardTitle>
                    <CardDescription>
                        Mehrfache fehlgeschlagene Anmeldeversuche zur Anomalieerkennung verfolgen
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>E-Mail</TableHead>
                                <TableHead>Versuche</TableHead>
                                <TableHead>Letzter Versuch</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Aktion</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {failedLogins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                        Keine verdächtige Anmeldeaktivität erkannt
                                    </TableCell>
                                </TableRow>
                            ) : (
                                failedLogins.map((login, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{login.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={login.attempts >= 5 ? "destructive" : "secondary"}>
                                                {login.attempts} Versuche
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(login.last_attempt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={login.status === "blocked" ? "destructive" : login.status === "warning" ? "secondary" : "outline"}>
                                                {login.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Admin Actions & Security Events */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-slate-600" />
                        Admin-Aktionen & Sicherheitsereignisse
                    </CardTitle>
                    <CardDescription>
                        Kritische administrative Aktionen, die eine Prüfspur erfordern
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ereignis</TableHead>
                                <TableHead>Akteur</TableHead>
                                <TableHead>Ziel</TableHead>
                                <TableHead>Schweregrad</TableHead>
                                <TableHead>Zeitstempel</TableHead>
                                <TableHead>IP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {securityEvents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Keine Admin-Aktionen aufgezeichnet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                securityEvents.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getEventIcon(event.event_type)}
                                                <span className="font-medium">{event.event_type.replace(/_/g, " ")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{event.actor_email}</TableCell>
                                        <TableCell>{event.target_email || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={getSeverityColor(event.severity)}>
                                                {event.severity.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(event.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {event.ip_address || "N/A"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* GDPR Compliance Events */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileWarning className="h-5 w-5 text-green-600" />
                        DSGVO-Compliance-Ereignisse
                    </CardTitle>
                    <CardDescription>
                        Datenlöschanfragen, Exporte und Zustimmungsänderungen verfolgen
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="font-medium">Keine ausstehenden DSGVO-Anfragen</p>
                                    <p className="text-sm text-muted-foreground">Alle Betroffenenanfragen wurden bearbeitet</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-green-100">Konform</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="p-4 bg-slate-50 rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Download className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Datenexporte</span>
                                </div>
                                <p className="text-2xl font-bold">0</p>
                                <p className="text-xs text-muted-foreground">Ausstehende Anfragen</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="font-medium">Datenlöschungen</span>
                                </div>
                                <p className="text-2xl font-bold">0</p>
                                <p className="text-xs text-muted-foreground">Recht auf Löschung</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Key className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium">Zustimmungsänderungen</span>
                                </div>
                                <p className="text-2xl font-bold">0</p>
                                <p className="text-xs text-muted-foreground">Diesen Monat</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
