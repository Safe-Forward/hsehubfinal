import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    FileText,
    Search,
    Download,
    RefreshCcw,
    Shield,
    Activity,
} from "lucide-react";

interface AuditLog {
    id: string;
    actor_email: string;
    actor_role: string;
    action_type: string;
    target_type: string;
    target_id: string | null;
    target_name: string | null;
    details: any;
    ip_address: string | null;
    company_id: string | null;
    created_at: string;
    companies?: {
        name: string;
    };
}

interface CompanyOption {
    id: string;
    name: string;
}

export default function AuditLogs() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [targetFilter, setTargetFilter] = useState("all");
    const [dateRange, setDateRange] = useState("7days");
    const [companyFilter, setCompanyFilter] = useState("all");
    const [actorFilter, setActorFilter] = useState("");
    const [companies, setCompanies] = useState<CompanyOption[]>([]);

    const [stats, setStats] = useState({
        totalLogs: 0,
        todayLogs: 0,
        criticalActions: 0,
    });

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    useEffect(() => {
        if (user && userRole === "super_admin") {
            fetchLogs();
            fetchStats();
            fetchCompanies();
        }
    }, [user, userRole, dateRange]);

    const actionOptions = useMemo(
        () => Array.from(new Set(logs.map((log) => log.action_type))).sort(),
        [logs]
    );

    const targetOptions = useMemo(
        () => Array.from(new Set(logs.map((log) => log.target_type))).sort(),
        [logs]
    );

    const fetchLogs = async () => {
        try {
            setLoadingData(true);

            // Calculate date filter
            const now = new Date();
            const daysAgo = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
            const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

            const { data, error } = await supabase
                .from("audit_logs")
                .select(`
          *,
          companies:company_id (
            name
          )
        `)
                .gte("created_at", startDate.toISOString())
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            setLogs(data || []);
        } catch (error: any) {
            console.error("Error fetching audit logs:", error);
            toast({
                title: "Fehler",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoadingData(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { count: totalLogs } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count: todayLogs } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true })
                .gte("created_at", today.toISOString());

            const criticalActions = [
                "block_company",
                "delete_user",
                "modify_subscription",
                "delete_company",
            ];

            const { count: criticalCount } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true })
                .in("action_type", criticalActions);

            setStats({
                totalLogs: totalLogs || 0,
                todayLogs: todayLogs || 0,
                criticalActions: criticalCount || 0,
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from("companies")
                .select("id, name")
                .order("name", { ascending: true });

            if (error) throw error;
            setCompanies((data || []) as CompanyOption[]);
        } catch (error) {
            console.error("Error fetching companies:", error);
        }
    };

    const handleExport = () => {
        const csv = [
            ["Datum", "Akteur", "Aktion", "Zieltyp", "Zielname", "IP-Adresse", "Unternehmen"],
            ...filteredLogs.map((log) => [
                new Date(log.created_at).toLocaleString(),
                log.actor_email,
                log.action_type,
                log.target_type,
                log.target_name || "N/A",
                log.ip_address || "N/A",
                log.companies?.name || "N/A",
            ]),
        ]
            .map((row) => row.join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.csv`;
        a.click();

        toast({
            title: "Erfolgreich",
            description: "Prüfprotokolle erfolgreich exportiert",
        });
    };

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.actor_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.target_name &&
                log.target_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesAction =
            actionFilter === "all" || log.action_type === actionFilter;

        const matchesTarget =
            targetFilter === "all" || log.target_type === targetFilter;

        const matchesCompany =
            companyFilter === "all" || log.company_id === companyFilter;

        const matchesActor =
            !actorFilter ||
            log.actor_email.toLowerCase().includes(actorFilter.toLowerCase());

        return matchesSearch && matchesAction && matchesTarget && matchesCompany && matchesActor;
    });

    const getActionBadgeVariant = (action: string) => {
        const critical = ["block_company", "delete_user", "delete_company"];
        const warning = ["modify_subscription", "extend_trial", "unblock_company"];

        if (critical.includes(action)) return "destructive";
        if (warning.includes(action)) return "secondary";
        return "outline";
    };

    if (loading || loadingData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Prüfprotokolle</h2>
                <p className="text-muted-foreground">
                    Vollständige Prüfspur aller Plattformaktivitäten und administrativen Aktionen
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Protokolle gesamt</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalLogs}</div>
                        <p className="text-xs text-muted-foreground">Gesamt</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Heutige Aktivität</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.todayLogs}
                        </div>
                        <p className="text-xs text-muted-foreground">Letzte 24 Stunden</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Kritische Aktionen</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats.criticalActions}
                        </div>
                        <p className="text-xs text-muted-foreground">Erfordert Aufmerksamkeit</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <Card className="md:col-span-2">
                    <CardContent className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Protokolle suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Alle Aktionen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Aktionen</SelectItem>
                                {actionOptions.map((action) => (
                                    <SelectItem key={action} value={action}>
                                        {action}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={targetFilter} onValueChange={setTargetFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Alle Ziele" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Ziele</SelectItem>
                                {targetOptions.map((target) => (
                                    <SelectItem key={target} value={target}>
                                        {target}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Alle Unternehmen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Unternehmen</SelectItem>
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7days">Letzte 7 Tage</SelectItem>
                                <SelectItem value="30days">Letzte 30 Tage</SelectItem>
                                <SelectItem value="90days">Letzte 90 Tage</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Input
                            placeholder="Nach Akteur-E-Mail filtern"
                            value={actorFilter}
                            onChange={(e) => setActorFilter(e.target.value)}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6">
                <Button onClick={fetchLogs} variant="outline">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Aktualisieren
                </Button>
                <Button onClick={handleExport} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    CSV exportieren
                </Button>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Prüfspur ({filteredLogs.length} Einträge)</CardTitle>
                    <CardDescription>
                        Vollständige Geschichte administrativer Aktionen und Systemereignisse
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Zeitstempel</TableHead>
                                    <TableHead>Akteur</TableHead>
                                    <TableHead>Aktion</TableHead>
                                    <TableHead>Ziel</TableHead>
                                    <TableHead>Unternehmen</TableHead>
                                    <TableHead>IP-Adresse</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            Keine Prüfprotokolle gefunden
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {new Date(log.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{log.actor_email}</p>
                                                    <Badge variant="outline" className="text-xs">
                                                        {log.actor_role}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getActionBadgeVariant(log.action_type)}>
                                                    {log.action_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">
                                                        {log.target_name || log.target_type}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {log.target_type}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {log.companies?.name || (
                                                    <span className="text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">
                                                    {log.ip_address || "N/A"}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
