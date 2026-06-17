import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  related_table?: string;
}

export default function NotificationBell() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (companyId && user) {
      fetchNotifications();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [companyId, user]);

  // Resolve the current user's display name from employees or team_members
  const resolveUserName = async (): Promise<string | null> => {
    if (!user?.email || !companyId) return null;

    // Try employees first
    const { data: emp } = await supabase
      .from("employees")
      .select("full_name")
      .ilike("email", user.email)
      .eq("company_id", companyId)
      .maybeSingle();
    if (emp?.full_name) return emp.full_name;

    // Try employees by user_id
    const { data: empById } = await supabase
      .from("employees")
      .select("full_name")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (empById?.full_name) return empById.full_name;

    // Try team_members
    const { data: member } = await supabase
      .from("team_members")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (member) return `${member.first_name} ${member.last_name}`.trim();

    // Try team_members by email
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
      .limit(100);

    if (!tasks) return [];

    const nameLower = userName.toLowerCase();
    const taskNotifications: Notification[] = [];

    for (const task of tasks) {
      // Skip if a real notification already exists for this task
      if (existingNotifIds.has(task.id)) continue;

      const title = (task.title || "").toLowerCase();
      const desc = (task.description || "").toLowerCase();

      // Check if user is @mentioned in this task
      const isMentioned = title.includes(`@${nameLower}`) || desc.includes(`@${nameLower}`);

      if (isMentioned) {
        taskNotifications.push({
          id: `task-mention-${task.id}`,
          title: "You were mentioned in a task",
          message: `Task: "${task.title}"`,
          category: "task",
          type: "info",
          is_read: task.status === "completed",
          created_at: task.created_at,
          related_id: task.id,
          related_table: "tasks",
        });
      }
    }

    return taskNotifications;
  };

  const fetchNotifications = async () => {
    try {
      // 1. Fetch real notifications from the notifications table
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const dbNotifications: Notification[] = data || [];

      // 2. Collect related_ids of existing task notifications to avoid duplicates
      const existingTaskIds = new Set<string>();
      for (const n of dbNotifications) {
        if (n.related_id) existingTaskIds.add(n.related_id);
      }

      // 3. Fetch task @mention notifications (tasks the user is mentioned in but no DB notification exists)
      const taskMentionNotifs = await fetchTaskMentionNotifications(existingTaskIds);

      // 4. Merge and sort by created_at descending
      const merged = [...dbNotifications, ...taskMentionNotifs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      setNotifications(merged);
      setUnreadCount(merged.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`notifications-realtime-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);

          // Only increment unread count if the notification is unread
          if (!newNotif.is_read) {
            setUnreadCount((prev) => prev + 1);
          }

          // Show toast for all task mentions and important notifications
          if (
            newNotif.category === "task" ||
            newNotif.type === "warning" ||
            newNotif.type === "error"
          ) {
            toast({
              title: newNotif.title,
              description: newNotif.message,
              variant: newNotif.type === "error" ? "destructive" : "default",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const updatedNotif = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
          );

          // Recalculate unread count to ensure accuracy
          setNotifications((prev) => {
            const count = prev.filter((n) => !n.is_read).length;
            setUnreadCount(count);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const markAsRead = async (id: string) => {
    // Synthetic task-mention notifications are not in the DB
    if (id.startsWith("task-mention-")) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
      setUnreadCount(0);

      toast({
        title: "✅ All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
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

  const handleNotificationClick = async (notification: Notification) => {
    markAsRead(notification.id);
    setOpen(false);

    // Fallback routes for categories without a specific record to deep-link to
    const fallbackRoutes: Record<string, string> = {
      task: "/tasks",
      training: "/training",
      audit: "/audits",
      incident: "/incidents",
      risk: "/risk-assessments",
      measure: "/measures",
      message: "/messages",
    };

    try {
      // Direct case: related record IS an employee (note mentions)
      if (notification.related_table === "employees" && notification.related_id) {
        navigate(`/employees/${notification.related_id}`);
        return;
      }

      // Tasks: look up the assigned employee, then deep-link to their profile
      if (notification.related_table === "tasks" && notification.related_id) {
        const { data } = await supabase
          .from("tasks")
          .select("assigned_to")
          .eq("id", notification.related_id)
          .maybeSingle();

        if (data?.assigned_to) {
          navigate(`/employees/${data.assigned_to}`);
          return;
        }
      }

      // Training records: look up the employee, then deep-link to their profile
      if (notification.related_table === "training_records" && notification.related_id) {
        const { data } = await supabase
          .from("training_records")
          .select("employee_id")
          .eq("id", notification.related_id)
          .maybeSingle();

        if (data?.employee_id) {
          navigate(`/employees/${data.employee_id}`);
          return;
        }
      }

      // Health checkups: look up the employee, then deep-link to their profile
      if (notification.related_table === "health_checkups" && notification.related_id) {
        const { data } = await supabase
          .from("health_checkups")
          .select("employee_id")
          .eq("id", notification.related_id)
          .maybeSingle();

        if (data?.employee_id) {
          navigate(`/employees/${data.employee_id}`);
          return;
        }
      }
    } catch (error) {
      console.error("Error resolving notification deep link:", error);
      // Fall through to the generic fallback route below
    }

    // Fallback: generic category overview page
    const route = fallbackRoutes[notification.category];
    if (route) {
      navigate(route);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="h-7 text-xs"
            >
              View all
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-muted mb-1 ${!notification.is_read ? "bg-muted/50" : ""
                    }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${getTypeColor(
                          notification.type
                        )}`}
                      >
                        <span className="text-lg">
                          {getCategoryIcon(notification.category)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
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
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
