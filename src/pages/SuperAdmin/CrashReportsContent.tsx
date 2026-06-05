import { useEffect, useState, useMemo } from "react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Bug,
    RefreshCcw,
    Download,
    FileText,
    Search,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Eye,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface CrashReport {
    id: string;
    actor_email: string;
    actor_role: string;
    action_type: string;
    target_type: string;
    target_name: string | null;
    details: any;
    ip_address: string | null;
    company_id: string | null;
    created_at: string;
    companies?: { name: string };
}

export default function CrashReportsContent() {
    const { toast } = useToast();
    const [reports, setReports] = useState<CrashReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState("all");
    const [dateRange, setDateRange] = useState("30days");
    const [selectedReport, setSelectedReport] = useState<CrashReport | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        thisWeek: 0,
    });

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    const fetchReports = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from("audit_logs")
                .select(`*, companies:company_id(name)`)
                // Error events are logged as action_type = 'error'
                .in("action_type", ["error", "crash", "exception", "system_error"])
                .order("created_at", { ascending: false })
                .limit(300);

            if (dateRange !== "all_time") {
                const daysAgo = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
                const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
                query = query.gte("created_at", startDate.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            setReports(data || []);

            // Stats
            const allErrors = await supabase
                .from("audit_logs")
                .select("id, created_at", { count: "exact", head: false })
                .in("action_type", ["error", "crash", "exception", "system_error"]);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const todayCount = (allErrors.data || []).filter(
                (r) => new Date(r.created_at) >= today
            ).length;
            const weekCount = (allErrors.data || []).filter(
                (r) => new Date(r.created_at) >= weekAgo
            ).length;

            setStats({
                total: allErrors.data?.length || 0,
                today: todayCount,
                thisWeek: weekCount,
            });
        } catch (err: any) {
            console.error("Error fetching crash reports:", err);
        } finally {
            setLoading(false);
        }
    };

    // Log an error/crash report programmatically
    const getSeverity = (report: CrashReport): "critical" | "warning" | "info" => {
        const details = report.details || {};
        if (details.severity === "critical" || report.action_type === "crash") return "critical";
        if (details.severity === "warning" || report.action_type === "exception") return "warning";
        return "info";
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case "critical":
                return <Badge variant="destructive" className="text-xs">Critical</Badge>;
            case "warning":
                return <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300">Warning</Badge>;
            default:
                return <Badge variant="outline" className="text-xs">Info</Badge>;
        }
    };

    const filtered = useMemo(() => {
        return reports.filter((r) => {
            const severity = getSeverity(r);
            const matchesSeverity = severityFilter === "all" || severity === severityFilter;
            const matchesSearch =
                (r.actor_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.target_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.companies?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                JSON.stringify(r.details || {}).toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSeverity && matchesSearch;
        });
    }, [reports, severityFilter, searchQuery]);

    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: "landscape" });

        doc.setFillColor(220, 38, 38);
        doc.rect(0, 0, 297, 22, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("HSE Safety Hub — Crash Reports", 14, 14);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${format(new Date(), "PPP p")} | Reports: ${filtered.length}`, 297 - 14, 14, { align: "right" });

        doc.setTextColor(30, 30, 30);

        autoTable(doc, {
            startY: 28,
            head: [["Timestamp", "Actor", "Severity", "Type", "Target", "Company", "Error Message"]],
            body: filtered.map((r) => [
                format(new Date(r.created_at), "MM/dd/yyyy HH:mm:ss"),
                r.actor_email,
                getSeverity(r).toUpperCase(),
                r.action_type,
                r.target_name || r.target_type || "—",
                r.companies?.name || "—",
                (r.details?.message || r.details?.error || JSON.stringify(r.details || {})).slice(0, 80),
            ]),
            styles: { fontSize: 7.5, cellPadding: 3 },
            headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [255, 245, 245] },
        });

        doc.save(`crash-reports-${format(new Date(), "yyyy-MM-dd")}.pdf`);
        toast({ title: "PDF Exported", description: `${filtered.length} crash reports exported` });
    };

    return (
        <div className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">Crash Report Tracking</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Application errors and crashes are recorded as <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">error</code> events in the audit log.
                        To log a crash, call <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">logAction({`{ action: "error", ... }`})</code> from any component error boundary.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
                        <Bug className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.today}</div>
                        <p className="text-xs text-muted-foreground">Last 24 hours</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Week</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.thisWeek}</div>
                        <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search errors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                        <SelectItem value="90days">Last 90 days</SelectItem>
                        <SelectItem value="all_time">All Time</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={fetchReports} variant="outline" size="sm" disabled={loading}>
                    <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
                <Button onClick={handleExportPDF} variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        Crash Reports ({filtered.length})
                    </CardTitle>
                    <CardDescription>
                        Application errors and exceptions logged to the audit system
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="border-t overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-36">Timestamp</TableHead>
                                    <TableHead>Actor</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Error Type</TableHead>
                                    <TableHead>Message</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead className="w-16 text-center">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <TableCell key={j}>
                                                    <div className="h-4 bg-muted animate-pulse rounded" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                                            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                                            <p className="font-medium">No errors found</p>
                                            <p className="text-xs mt-1">The system is running smoothly for the selected period</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((report) => {
                                        const severity = getSeverity(report);
                                        const errMsg = report.details?.message || report.details?.error || "No message";
                                        return (
                                            <TableRow key={report.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors">
                                                <TableCell className="whitespace-nowrap">
                                                    <div>
                                                        <p className="text-xs font-medium">
                                                            {new Date(report.created_at).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(report.created_at).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm font-medium truncate max-w-[140px]">{report.actor_email}</p>
                                                    <p className="text-xs text-muted-foreground">{report.actor_role}</p>
                                                </TableCell>
                                                <TableCell>{getSeverityBadge(severity)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs font-mono">
                                                        {report.action_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm max-w-[200px]">
                                                    <span className="truncate block text-red-700 dark:text-red-300">
                                                        {String(errMsg).slice(0, 80)}{String(errMsg).length > 80 ? "…" : ""}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {report.companies?.name || <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => { setSelectedReport(report); setDetailOpen(true); }}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bug className="w-4 h-4 text-red-500" />
                            Crash Report Detail
                        </DialogTitle>
                        <DialogDescription>
                            {selectedReport && new Date(selectedReport.created_at).toLocaleString()}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReport && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Actor</p>
                                    <p className="font-medium">{selectedReport.actor_email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Company</p>
                                    <p className="font-medium">{selectedReport.companies?.name || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">IP Address</p>
                                    <p className="font-mono text-sm">{selectedReport.ip_address || "—"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1.5">Full Error Details</p>
                                <pre className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3 text-xs overflow-auto max-h-64 font-mono text-red-800 dark:text-red-200 whitespace-pre-wrap break-all">
                                    {JSON.stringify(selectedReport.details || {}, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
