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
} from "@/components/ui/dialog";
import {
    FileText,
    Search,
    Download,
    RefreshCcw,
    Shield,
    Activity,
    ChevronDown,
    ChevronUp,
    Eye,
    AlertTriangle,
    Bug,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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

const ALL_ACTION_TYPES = [
    // Auth
    { value: "login", label: "Login" },
    { value: "logout", label: "Logout" },
    { value: "signup", label: "Sign Up" },
    { value: "password_reset", label: "Password Reset" },
    // Company admin actions
    { value: "block_company", label: "Block Company" },
    { value: "unblock_company", label: "Unblock Company" },
    { value: "delete_company", label: "Delete Company" },
    { value: "modify_subscription", label: "Modify Subscription" },
    { value: "extend_trial", label: "Extend Trial" },
    { value: "cancel_subscription", label: "Cancel Subscription" },
    { value: "reactivate_subscription", label: "Reactivate Subscription" },
    // Users
    { value: "create_employee", label: "Create Employee" },
    { value: "delete_employee", label: "Delete Employee" },
    { value: "delete_user", label: "Delete User" },
    { value: "invite_team_member", label: "Invite Team Member" },
    { value: "update_user_role", label: "Update User Role" },
    // Tasks & Activities
    { value: "assign_task", label: "Assign Task" },
    { value: "complete_task", label: "Complete Task" },
    { value: "reopen_task", label: "Reopen Task" },
    // Incidents
    { value: "create_incident", label: "Create Incident" },
    { value: "update_incident", label: "Update Incident" },
    { value: "close_incident", label: "Close Incident" },
    // Invoices & Billing
    { value: "send_invoice", label: "Send Invoice" },
    { value: "update_billing_email", label: "Update Billing Email" },
    { value: "download_invoice", label: "Download Invoice" },
    { value: "create_draft_invoice", label: "Create Draft Invoice" },
    { value: "start_checkout", label: "Start Checkout" },
    { value: "checkout_session_completed", label: "Checkout Completed" },
    { value: "open_billing_portal", label: "Open Billing Portal" },
    { value: "invoice_paid", label: "Invoice Paid" },
    { value: "invoice_payment_failed", label: "Invoice Payment Failed" },
    // Settings
    { value: "update_settings", label: "Update Settings" },
    { value: "generate_api_token", label: "Generate API Token" },
    { value: "connect_external_system", label: "Connect External System" },
    { value: "activate_iso_standard", label: "Activate ISO Standard" },
    { value: "deactivate_iso_standard", label: "Deactivate ISO Standard" },
    // Notes
    { value: "add_employee_note", label: "Add Note" },
    { value: "delete_employee_note", label: "Delete Note" },
    // Documents
    { value: "download_report", label: "Download Report" },
    { value: "view", label: "View" },
    // Errors
    { value: "error", label: "Error / Crash" },
];

const CRITICAL_ACTIONS = ["block_company", "delete_user", "delete_company", "error"];
const WARNING_ACTIONS = [
    "modify_subscription", "extend_trial", "unblock_company",
    "cancel_subscription", "invite_team_member", "generate_api_token"
];

export default function AuditLogsContent() {
    const { toast } = useToast();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [targetFilter, setTargetFilter] = useState("all");
    const [dateRange, setDateRange] = useState("7days");
    const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [stats, setStats] = useState({
        totalLogs: 0,
        todayLogs: 0,
        criticalActions: 0,
        errorCount: 0,
    });

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [dateRange]);

    const fetchLogs = async () => {
        try {
            setLoadingData(true);

            let query = supabase
                .from("audit_logs")
                .select(`
                    *,
                    companies:company_id (
                        name
                    )
                `)
                .order("created_at", { ascending: false })
                .limit(500);

            // Apply date filter (skip for "all_time")
            if (dateRange !== "all_time") {
                const now = new Date();
                const daysAgo = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
                const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                query = query.gte("created_at", startDate.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);
        } catch (error: any) {
            console.error("Error fetching audit logs:", error);
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
            const { count: totalLogs } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count: todayLogs } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true })
                .gte("created_at", today.toISOString());

            const { count: criticalCount } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true })
                .in("action_type", CRITICAL_ACTIONS.filter(a => a !== "error"));

            const { count: errorCount } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true })
                .eq("action_type", "error");

            setStats({
                totalLogs: totalLogs || 0,
                todayLogs: todayLogs || 0,
                criticalActions: criticalCount || 0,
                errorCount: errorCount || 0,
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    // CSV export
    const handleExportCSV = () => {
        const csv = [
            ["Date", "Time", "Actor", "Role", "Action", "Target Type", "Target Name", "IP Address", "Company", "Details"],
            ...filteredLogs.map((log) => [
                new Date(log.created_at).toLocaleDateString(),
                new Date(log.created_at).toLocaleTimeString(),
                log.actor_email,
                log.actor_role,
                log.action_type,
                log.target_type,
                log.target_name || "N/A",
                log.ip_address || "N/A",
                log.companies?.name || "N/A",
                JSON.stringify(log.details || {}),
            ]),
        ]
            .map((row) => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({ title: "CSV Exported", description: `${filteredLogs.length} records exported` });
    };

    // PDF export
    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: "landscape" });

        // Header
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, 297, 22, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("HSE Safety Hub — Audit Log Report", 14, 14);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${format(new Date(), "PPP p")} | Records: ${filteredLogs.length}`, 297 - 14, 14, { align: "right" });

        doc.setTextColor(30, 30, 30);

        autoTable(doc, {
            startY: 28,
            head: [["Timestamp", "Actor", "Role", "Action", "Target", "Company", "IP Address"]],
            body: filteredLogs.map((log) => [
                format(new Date(log.created_at), "MM/dd/yyyy HH:mm:ss"),
                log.actor_email,
                log.actor_role,
                log.action_type,
                log.target_name || log.target_type || "—",
                log.companies?.name || "—",
                log.ip_address || "—",
            ]),
            styles: { fontSize: 7.5, cellPadding: 3 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [245, 247, 255] },
            columnStyles: {
                0: { cellWidth: 36 },
                1: { cellWidth: 52 },
                2: { cellWidth: 26 },
                3: { cellWidth: 38 },
                4: { cellWidth: 40 },
                5: { cellWidth: 40 },
                6: { cellWidth: 26 },
            },
            didParseCell: (data) => {
                if (data.section === "body" && data.column.index === 3) {
                    const action = data.cell.text[0];
                    if (CRITICAL_ACTIONS.includes(action)) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = "bold";
                    } else if (WARNING_ACTIONS.includes(action)) {
                        data.cell.styles.textColor = [180, 83, 9];
                    }
                }
            },
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount} — HSE Safety Hub Audit Report`, 148.5, doc.internal.pageSize.height - 6, { align: "center" });
        }

        doc.save(`audit-logs-${format(new Date(), "yyyy-MM-dd")}.pdf`);
        toast({ title: "PDF Exported", description: `${filteredLogs.length} records exported as PDF` });
    };

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesSearch =
                (log.actor_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.action_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.target_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.companies?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.ip_address || "").toLowerCase().includes(searchQuery.toLowerCase());

            const matchesAction =
                actionFilter === "all" || log.action_type === actionFilter;

            const matchesTarget =
                targetFilter === "all" || log.target_type === targetFilter;

            return matchesSearch && matchesAction && matchesTarget;
        });
    }, [logs, searchQuery, actionFilter, targetFilter]);

    const getActionBadgeVariant = (action: string) => {
        if (CRITICAL_ACTIONS.includes(action)) return "destructive";
        if (WARNING_ACTIONS.includes(action)) return "secondary";
        return "outline";
    };

    const getActionColor = (action: string) => {
        if (CRITICAL_ACTIONS.includes(action)) return "text-red-600 dark:text-red-400";
        if (WARNING_ACTIONS.includes(action)) return "text-amber-600 dark:text-amber-400";
        if (["login", "signup"].includes(action)) return "text-green-600 dark:text-green-400";
        return "";
    };

    const openDetail = (log: AuditLog) => {
        setDetailLog(log);
        setDetailOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.todayLogs}</div>
                        <p className="text-xs text-muted-foreground">Last 24 hours</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Actions</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.criticalActions}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Errors / Crashes</CardTitle>
                        <Bug className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.errorCount}</div>
                        <p className="text-xs text-muted-foreground">Application errors</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by actor, action, target, company, IP..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                        <SelectItem value="all">All Actions</SelectItem>
                        {ALL_ACTION_TYPES.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                        <SelectItem value="90days">Last 90 days</SelectItem>
                        <SelectItem value="all_time">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Target type filter + actions row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Select value={targetFilter} onValueChange={setTargetFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="All Target Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Targets</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="incident">Incident</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex gap-2 ml-auto">
                    <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loadingData}>
                        <RefreshCcw className={`w-4 h-4 mr-2 ${loadingData ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleExportCSV} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                    </Button>
                    <Button onClick={handleExportPDF} variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                    </Button>
                </div>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Audit Trail</CardTitle>
                            <CardDescription>
                                {loadingData ? "Loading..." : `${filteredLogs.length} of ${logs.length} entries shown`}
                            </CardDescription>
                        </div>
                        {filteredLogs.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {filteredLogs.filter(l => CRITICAL_ACTIONS.includes(l.action_type)).length} critical
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-b-lg border-t overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-36">Timestamp</TableHead>
                                    <TableHead>Actor</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead className="w-28">IP Address</TableHead>
                                    <TableHead className="w-16 text-center">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingData ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <TableCell key={j}>
                                                    <div className="h-4 bg-muted animate-pulse rounded" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p>No audit logs found</p>
                                            <p className="text-xs mt-1">Try adjusting filters or expanding the date range</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="whitespace-nowrap">
                                                <div>
                                                    <p className="text-xs font-medium">
                                                        {new Date(log.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm truncate max-w-[160px]">{log.actor_email}</p>
                                                    <Badge variant="outline" className="text-xs mt-0.5">
                                                        {log.actor_role}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getActionBadgeVariant(log.action_type)}
                                                    className={`text-xs ${getActionColor(log.action_type)}`}
                                                >
                                                    {log.action_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">{log.target_name || log.target_type || "—"}</p>
                                                    <p className="text-xs text-muted-foreground">{log.target_type}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {log.companies?.name || (
                                                    <span className="text-muted-foreground text-xs">System</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {log.ip_address || "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {log.details && Object.keys(log.details || {}).length > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => openDetail(log)}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="w-4 h-4 text-primary" />
                            Log Details — {detailLog?.action_type}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground">Actor</p>
                                <p className="font-medium">{detailLog?.actor_email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Timestamp</p>
                                <p className="font-medium">
                                    {detailLog && new Date(detailLog.created_at).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Target</p>
                                <p className="font-medium">{detailLog?.target_name || detailLog?.target_type || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">IP Address</p>
                                <p className="font-mono text-sm">{detailLog?.ip_address || "—"}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Details Payload</p>
                            <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-48 font-mono">
                                {JSON.stringify(detailLog?.details || {}, null, 2)}
                            </pre>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
