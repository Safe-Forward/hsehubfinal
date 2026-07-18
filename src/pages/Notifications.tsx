import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Notification {
    id: string;
    title: string;
    message: string;
    category: string;
    type: string;
    is_read: boolean;
    created_at: string;
    related_id?: string;
}

export default function Notifications() {
    const { user, companyId } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (companyId && user) {
            fetchNotifications();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, user]);

    // Resolve the current user's display name from employees or team_members
    const resolveUserName = async (): Promise<string | null> => {
        if (!user?.email || !companyId) return null;

        const { data: emp } = await supabase
            .from("employees")
            .select("full_name")
            .ilike("email", user.email)
            .eq("company_id", companyId)
            .maybeSingle();
        if (emp?.full_name) return emp.full_name;

        const { data: empById } = await supabase
            .from("employees")
            .select("full_name")
            .eq("user_id", user.id)
            .eq("company_id", companyId)
            .maybeSingle();
        if (empById?.full_name) return empById.full_name;

        const { data: member } = await supabase
            .from("team_members")
            .select("first_name, last_name")
            .eq("user_id", user.id)
            .eq("company_id", companyId)
            .maybeSingle();
        if (member) return `${member.first_name} ${member.last_name}`.trim();

        const { data: memberByEmail } = await supabase
            .from("team_members")
            .select("first_name, last_name")
            .ilike("email", user.email)
            .eq("company_id", companyId)
            .maybeSingle();
        if (memberByEmail) return `${memberByEmail.first_name} ${memberByEmail.last_name}`.trim();

        return null;
    };

    // Fetch tasks that @mention the current user and convert to notification objects
    const fetchTaskMentionNotifications = async (existingNotifIds: Set<string>): Promise<Notification[]> => {
        const userName = await resolveUserName();
        if (!userName) return [];

        const { data: tasks } = await supabase
            .from("tasks")
            .select("id, title, description, created_at, status, assigned_to")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(200);

        if (!tasks) return [];

        const nameLower = userName.toLowerCase();
        const taskNotifications: Notification[] = [];

        for (const task of tasks) {
            if (existingNotifIds.has(task.id)) continue;

            const title = (task.title || "").toLowerCase();
            const desc = (task.description || "").toLowerCase();
            const isMentioned = title.includes(`@${nameLower}`) || desc.includes(`@${nameLower}`);

            if (isMentioned) {
                taskNotifications.push({
                    id: `task-mention-${task.id}`,
                    title: "Sie wurden in einer Aufgabe erwähnt",
                    message: `Task: "${task.title}"`,
                    category: "task",
                    type: "info",
                    is_read: task.status === "completed",
                    created_at: task.created_at,
                    related_id: task.id,
                });
            }
        }

        return taskNotifications;
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // 1. Fetch real DB notifications
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("company_id", companyId)
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const dbNotifications: Notification[] = data || [];

            // 2. Collect related_ids to avoid duplicates
            const existingTaskIds = new Set<string>();
            for (const n of dbNotifications) {
                if (n.related_id) existingTaskIds.add(n.related_id);
            }

            // 3. Fetch task @mention notifications
            const taskMentionNotifs = await fetchTaskMentionNotifications(existingTaskIds);

            // 4. Merge and sort
            const merged = [...dbNotifications, ...taskMentionNotifs]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setNotifications(merged);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            toast.error("Benachrichtigungen konnten nicht geladen werden");
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        // Synthetic task-mention notifications are not in the DB
        if (id.startsWith("task-mention-")) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            return;
        }
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", id);

            if (error) throw error;

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("company_id", companyId)
                .eq("user_id", user?.id)
                .eq("is_read", false);

            if (error) throw error;

            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            toast.success("Alle Benachrichtigungen als gelesen markiert");
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const deleteNotification = async (id: string) => {
        // Synthetic task-mention notifications — just remove from UI
        if (id.startsWith("task-mention-")) {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            toast.success("Benachrichtigung ausgeblendet");
            return;
        }
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setNotifications((prev) => prev.filter((n) => n.id !== id));
            toast.success("Benachrichtigung gelöscht");
        } catch (error) {
            console.error("Error deleting notification:", error);
            toast.error("Benachrichtigung konnte nicht gelöscht werden");
        }
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            task: "📋",
            training: "🎓",
            audit: "🔍",
            incident: "⚠️",
            risk: "🎯",
            measure: "✅",
            message: "💬",
            system: "🔔",
        };
        return icons[category] || "📢";
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            info: "bg-blue-500",
            success: "bg-green-500",
            warning: "bg-yellow-500",
            error: "bg-red-500",
        };
        return colors[type] || "bg-gray-500";
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);

        const routes: Record<string, string> = {
            task: "/tasks",
            training: "/training",
            audit: "/audits",
            incident: "/incidents",
            risk: "/risk-assessments",
            measure: "/measures",
            message: "/messages",
        };

        const route = routes[notification.category];
        if (route) {
            navigate(route);
        }
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8" data-testid="notifications-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    <p className="text-muted-foreground">
                        {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button data-testid="notifications-mark-all-read" variant="outline" onClick={markAllAsRead}>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Mark all as read
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        All Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No notifications yet</p>
                            <p className="text-sm">You'll see notifications here when someone mentions you or sends you a message.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[600px]">
                            <div className="space-y-3">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        data-testid={`notification-item-${notification.id}`}
                                        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${!notification.is_read ? "bg-muted/30 border-primary/20" : ""
                                            }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div
                                            className={`h-12 w-12 rounded-full flex items-center justify-center text-white flex-shrink-0 ${getTypeColor(
                                                notification.type
                                            )}`}
                                        >
                                            <span className="text-xl">{getCategoryIcon(notification.category)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{notification.title}</h4>
                                                    {!notification.is_read && (
                                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {!notification.is_read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(notification.id);
                                                            }}
                                                            className="h-8 w-8 p-0"
                                                            title="Als gelesen markieren"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notification.id);
                                                        }}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                        title="Benachrichtigung löschen"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(notification.created_at), {
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    {notification.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
