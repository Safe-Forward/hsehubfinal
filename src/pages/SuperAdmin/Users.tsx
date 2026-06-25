import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
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
    Users,
    Search,
    Building2,
    ShieldAlert,
    UserCheck,
    UserX,
    Eye,
    Trash2,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface GlobalUser {
    user_id: string;
    email: string;
    full_name: string;
    role: string;
    company_id: string;
    company_name: string;
    last_login_at: string | null;
    failed_login_count: number;
    created_at: string;
}

export default function GlobalUsers() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [users, setUsers] = useState<GlobalUser[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        failedLogins: 0,
    });

    // Delete user state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<GlobalUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    useEffect(() => {
        if (user && userRole === "super_admin") {
            fetchUsers();
            fetchStats();
        }
    }, [user, userRole]);

    const fetchUsers = async () => {
        try {
            setLoadingData(true);

            // PostgREST caps unranged/unranged-.in() selects at 1000 rows -
            // loop with .range() until a page comes back short. This list
            // is platform-wide (all users across all companies), so it's
            // exactly the query most likely to eventually exceed 1000 as
            // the customer base grows - without this it would silently
            // hide users instead of erroring.
            const PAGE_SIZE = 1000;
            const fetchAllPages = async <T,>(
                buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
            ): Promise<T[]> => {
                const allRows: T[] = [];
                let from = 0;
                while (true) {
                    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
                    if (error) throw error;
                    allRows.push(...(data || []));
                    if (!data || data.length < PAGE_SIZE) break;
                    from += PAGE_SIZE;
                }
                return allRows;
            };

            // Fetch all user roles
            const userRolesData = await fetchAllPages<{
                user_id: string;
                role: string;
                company_id: string | null;
                last_login_at: string | null;
                failed_login_count: number | null;
                created_at: string;
            }>((from, to) =>
                supabase
                    .from("user_roles")
                    .select("user_id, role, company_id, last_login_at, failed_login_count, created_at")
                    .not("company_id", "is", null)
                    .order("created_at", { ascending: false })
                    .range(from, to)
            );

            if (userRolesData.length === 0) {
                setUsers([]);
                setLoadingData(false);
                return;
            }

            // Get unique user IDs and company IDs
            const userIds = [...new Set(userRolesData.map((ur) => ur.user_id))];
            const companyIds = [...new Set(userRolesData.map((ur) => ur.company_id).filter(Boolean))];

            // Fetch profiles separately
            const profilesData = await fetchAllPages<{ id: string; email: string; full_name: string }>(
                (from, to) => supabase.from("profiles").select("id, email, full_name").in("id", userIds).range(from, to)
            );

            // Fetch companies separately
            const companiesData = await fetchAllPages<{ id: string; name: string }>((from, to) =>
                supabase.from("companies").select("id, name").in("id", companyIds as string[]).range(from, to)
            );

            // Join the data on the frontend
            const transformedUsers = userRolesData.map((ur) => {
                const profile = profilesData?.find((p) => p.id === ur.user_id);
                const company = companiesData?.find((c) => c.id === ur.company_id);

                return {
                    user_id: ur.user_id,
                    email: profile?.email || "N/A",
                    full_name: profile?.full_name || "N/A",
                    role: ur.role,
                    company_id: ur.company_id,
                    company_name: company?.name || "Unknown",
                    last_login_at: ur.last_login_at,
                    failed_login_count: ur.failed_login_count || 0,
                    created_at: ur.created_at,
                };
            });

            setUsers(transformedUsers);
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
            const { count: totalUsers } = await supabase
                .from("user_roles")
                .select("id", { count: "exact", head: true })
                .not("company_id", "is", null);

            const { count: activeUsers } = await supabase
                .from("user_roles")
                .select("id", { count: "exact", head: true })
                .not("last_login_at", "is", null)
                .not("company_id", "is", null);

            const { data: failedLoginsData } = await supabase
                .from("user_roles")
                .select("failed_login_count")
                .not("company_id", "is", null);

            const totalFailedLogins = failedLoginsData?.reduce(
                (sum, u) => sum + (u.failed_login_count || 0),
                0
            ) || 0;

            setStats({
                totalUsers: totalUsers || 0,
                activeUsers: activeUsers || 0,
                blockedUsers: 0, // We'll implement blocking later
                failedLogins: totalFailedLogins,
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.company_name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === "all" || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        setDeleting(true);
        try {
            // Soft delete: Remove user role (revokes access)
            const { error: roleError } = await supabase
                .from("user_roles")
                .delete()
                .eq("user_id", userToDelete.user_id)
                .eq("company_id", userToDelete.company_id);

            if (roleError) throw roleError;

            // Log the deletion in audit logs
            await supabase.from("audit_logs").insert({
                actor_email: user?.email,
                actor_role: "super_admin",
                action_type: "delete_user",
                target_type: "user",
                target_name: userToDelete.email,
                details: {
                    user_name: userToDelete.full_name,
                    company_name: userToDelete.company_name,
                    deleted_by: "super_admin",
                },
                company_id: userToDelete.company_id,
            });

            toast({
                title: "User Deleted",
                description: `${userToDelete.full_name} has been removed from ${userToDelete.company_name}`,
            });

            setDeleteDialogOpen(false);
            setUserToDelete(null);
            fetchUsers();
            fetchStats();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
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
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Global User Management</h2>
                <p className="text-muted-foreground">
                    View and manage all users across all companies
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Across all companies</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.activeUsers}
                        </div>
                        <p className="text-xs text-muted-foreground">Have logged in</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocked Users</CardTitle>
                        <UserX className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats.blockedUsers}
                        </div>
                        <p className="text-xs text-muted-foreground">Currently blocked</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {stats.failedLogins}
                        </div>
                        <p className="text-xs text-muted-foreground">Total attempts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="md:col-span-2">
                    <CardContent className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="company_admin">Company Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Users ({filteredUsers.length})</CardTitle>
                    <CardDescription>
                        Cross-company user directory with security insights
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead>Failed Logins</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={`${user.user_id}-${user.company_id}`}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{user.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    to={`/super-admin/companies/${user.company_id}`}
                                                    className="flex items-center gap-2 hover:underline"
                                                >
                                                    <Building2 className="w-4 h-4" />
                                                    {user.company_name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{user.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.last_login_at ? (
                                                    <div>
                                                        <p className="text-sm">
                                                            {new Date(user.last_login_at).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(user.last_login_at).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <Badge variant="secondary">Never</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.failed_login_count > 0 ? (
                                                    <Badge variant="destructive">
                                                        {user.failed_login_count}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link to={`/super-admin/companies/${user.company_id}`}>
                                                        <Button variant="ghost" size="icon" title="View Company">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        title="Delete User"
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Delete User Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this user? This will revoke their access to the company.
                        </DialogDescription>
                    </DialogHeader>
                    {userToDelete && (
                        <div className="py-4 space-y-2">
                            <p><strong>Name:</strong> {userToDelete.full_name}</p>
                            <p><strong>Email:</strong> {userToDelete.email}</p>
                            <p><strong>Company:</strong> {userToDelete.company_name}</p>
                            <p><strong>Role:</strong> {userToDelete.role}</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setUserToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete User"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
