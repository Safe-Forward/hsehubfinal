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
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Headphones,
    AlertCircle,
    CheckCircle2,
    Clock,
    TrendingUp,
    MessageSquare,
    Lightbulb,
    Bug,
    BarChart3,
    RefreshCcw,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

interface SupportTicket {
    id: string;
    company_id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    category: string;
    created_at: string;
    companies?: {
        name: string;
    };
}

const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444"];

export default function Support() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("tickets");

    // Edit ticket state
    const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
    const [editForm, setEditForm] = useState({
        status: "",
        priority: "",
        admin_notes: "",
    });
    const [isSavingTicket, setIsSavingTicket] = useState(false);

    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        avgResponseTime: "2.4 hours",
        featureRequests: 0,
        bugReports: 0,
    });

    const [commonProblems, setCommonProblems] = useState<{ name: string; count: number; percentage: number }[]>([]);

    const [priorityBreakdown, setPriorityBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    useEffect(() => {
        if (user && userRole === "super_admin") {
            fetchTickets();
            fetchStats();
        }
    }, [user, userRole]);

    const fetchTickets = async () => {
        try {
            setLoadingData(true);

            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          companies:company_id (
            name
          )
        `)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            setTickets(data || []);

            if (data) {
                const urgent = data.filter(t => t.priority === "urgent").length;
                const high = data.filter(t => t.priority === "high").length;
                const medium = data.filter(t => t.priority === "medium").length;
                const low = data.filter(t => t.priority === "low").length;

                setPriorityBreakdown([
                    { name: "Urgent", value: urgent, color: "#EF4444" },
                    { name: "High", value: high, color: "#F59E0B" },
                    { name: "Medium", value: medium, color: "#3B82F6" },
                    { name: "Low", value: low, color: "#10B981" },
                ].filter(e => e.value > 0));

                const categoryCounts: Record<string, number> = {};
                data.forEach(t => {
                    const cat = t.category || "other";
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                });
                const total = data.length;
                const problems = Object.entries(categoryCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, count]) => ({
                        name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                        count,
                        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
                    }));
                setCommonProblems(problems);
            }
        } catch (error: any) {
            console.error("Error fetching tickets:", error);
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
            const { count: total } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true });

            const { count: open } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "open");

            const { count: inProgress } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "in_progress");

            const { count: resolved } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "resolved");

            const { count: featureRequests } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("category", "feature_request");

            const { count: bugReports } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("category", "bug");

            setStats({
                total: total || 0,
                open: open || 0,
                inProgress: inProgress || 0,
                resolved: resolved || 0,
                avgResponseTime: "2.4 hours",
                featureRequests: featureRequests || 0,
                bugReports: bugReports || 0,
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    // Open edit dialog with ticket data
    const openEditDialog = (ticket: SupportTicket) => {
        setEditingTicket(ticket);
        setEditForm({
            status: ticket.status,
            priority: ticket.priority,
            admin_notes: "",
        });
    };

    // Update ticket
    const updateTicket = async () => {
        if (!editingTicket) return;

        setIsSavingTicket(true);
        try {
            const { error } = await supabase
                .from("support_tickets")
                .update({
                    status: editForm.status,
                    priority: editForm.priority,
                })
                .eq("id", editingTicket.id);

            if (error) throw error;

            toast({
                title: "Ticket Updated",
                description: "The support ticket has been updated successfully.",
            });

            setEditingTicket(null);
            fetchTickets();
            fetchStats();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update ticket",
                variant: "destructive",
            });
        } finally {
            setIsSavingTicket(false);
        }
    };

    const filteredTickets = tickets.filter((ticket) => {
        const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
        const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
        return matchesStatus && matchesPriority && matchesCategory;
    });

    const getPriorityBadge = (priority: string) => {
        const variants: Record<string, { variant: any; color: string }> = {
            low: { variant: "outline", color: "text-gray-600" },
            medium: { variant: "secondary", color: "text-yellow-600" },
            high: { variant: "default", color: "text-orange-600" },
            urgent: { variant: "destructive", color: "text-red-600" },
        };
        return variants[priority] || variants.medium;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            open: "destructive",
            in_progress: "secondary",
            resolved: "default",
            closed: "outline",
        };
        return variants[status] || "outline";
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "feature_request": return <Lightbulb className="h-4 w-4 text-amber-500" />;
            case "bug": return <Bug className="h-4 w-4 text-red-500" />;
            default: return <MessageSquare className="h-4 w-4 text-blue-500" />;
        }
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
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Support & Customer Feedback</h2>
                    <p className="text-muted-foreground">
                        Manage support tickets, feature requests, and bug reports
                    </p>
                </div>
                <Button variant="outline" onClick={() => { fetchTickets(); fetchStats(); }}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.open}</div>
                        <p className="text-xs text-muted-foreground">Needs attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                        <p className="text-xs text-muted-foreground">Being worked on</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}</div>
                        <p className="text-xs text-muted-foreground">Response time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.featureRequests}</div>
                        <p className="text-xs text-muted-foreground">Pending review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
                        <Bug className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.bugReports}</div>
                        <p className="text-xs text-muted-foreground">Active bugs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Most Common Problems */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-500" />
                            Most Common Problems
                        </CardTitle>
                        <CardDescription>Top issues reported by customers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {commonProblems.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">Noch keine Tickets vorhanden.</p>
                        ) : (
                            <div className="space-y-4">
                                {commonProblems.map((problem, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{problem.name}</span>
                                            <span className="text-muted-foreground">{problem.count} tickets ({problem.percentage}%)</span>
                                        </div>
                                        <Progress value={problem.percentage} className="h-2" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tickets by Priority */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tickets by Priority</CardTitle>
                        <CardDescription>Distribution of ticket priorities</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={priorityBreakdown}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {priorityBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconSize={10}
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                        formatter={(value, entry: any) => (
                                            <span className="text-sm">
                                                {entry.payload.name}: {entry.payload.value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Tickets, Feature Requests, Bug Reports */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="tickets" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        All Tickets
                    </TabsTrigger>
                    <TabsTrigger value="features" className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Feature Requests
                    </TabsTrigger>
                    <TabsTrigger value="bugs" className="flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        Bug Reports
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tickets">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                                <SelectItem value="feature_request">Feature Request</SelectItem>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="billing">Billing</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tickets Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Support Tickets ({filteredTickets.length})</CardTitle>
                            <CardDescription>Customer support requests and feedback tracking</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ticket</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTickets.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No support tickets found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredTickets.map((ticket) => (
                                                <TableRow key={ticket.id}>
                                                    <TableCell>
                                                        <div className="flex items-start gap-2">
                                                            {getCategoryIcon(ticket.category)}
                                                            <div>
                                                                <p className="font-medium">{ticket.title}</p>
                                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                                    {ticket.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{ticket.companies?.name || "N/A"}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{ticket.category?.replace("_", " ")}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getPriorityBadge(ticket.priority).variant}>
                                                            {ticket.priority}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadge(ticket.status)}>
                                                            {ticket.status?.replace("_", " ")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(ticket)}>Edit</Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="features">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-amber-500" />
                                Feature Requests ({stats.featureRequests})
                            </CardTitle>
                            <CardDescription>Customer suggestions for new features and improvements</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Request</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tickets.filter(t => t.category === "feature_request").length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    <Lightbulb className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                                                    No feature requests yet
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            tickets.filter(t => t.category === "feature_request").map((ticket) => (
                                                <TableRow key={ticket.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{ticket.title}</p>
                                                            <p className="text-sm text-muted-foreground">{ticket.description}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{ticket.companies?.name || "N/A"}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getPriorityBadge(ticket.priority).variant}>
                                                            {ticket.priority}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadge(ticket.status)}>
                                                            {ticket.status?.replace("_", " ")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bugs">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bug className="h-5 w-5 text-red-500" />
                                Bug Reports ({stats.bugReports})
                            </CardTitle>
                            <CardDescription>Reported issues and bugs from customers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bug</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tickets.filter(t => t.category === "bug").length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    <Bug className="h-8 w-8 mx-auto mb-2 text-green-400" />
                                                    No bug reports - great job!
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            tickets.filter(t => t.category === "bug").map((ticket) => (
                                                <TableRow key={ticket.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{ticket.title}</p>
                                                            <p className="text-sm text-muted-foreground">{ticket.description}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{ticket.companies?.name || "N/A"}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getPriorityBadge(ticket.priority).variant}>
                                                            {ticket.priority}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadge(ticket.status)}>
                                                            {ticket.status?.replace("_", " ")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Ticket Dialog */}
            <Dialog open={!!editingTicket} onOpenChange={(open) => !open && setEditingTicket(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Support Ticket</DialogTitle>
                        <DialogDescription>
                            Update the status and priority of this ticket.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTicket && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-muted-foreground text-xs">Ticket</Label>
                                <p className="font-medium">{editingTicket.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">{editingTicket.description}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Company</Label>
                                <p className="font-medium">{editingTicket.companies?.name || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Status</Label>
                                    <Select
                                        value={editForm.status}
                                        onValueChange={(value) =>
                                            setEditForm((prev) => ({ ...prev, status: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                            <SelectItem value="closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Priority</Label>
                                    <Select
                                        value={editForm.priority}
                                        onValueChange={(value) =>
                                            setEditForm((prev) => ({ ...prev, priority: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setEditingTicket(null)}>
                                    Cancel
                                </Button>
                                <Button onClick={updateTicket} disabled={isSavingTicket}>
                                    {isSavingTicket ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
