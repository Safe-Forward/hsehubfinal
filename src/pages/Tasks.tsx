import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useRealtimeRefetch } from "@/hooks/useRealtimeRefetch";
import { ArrowLeft, Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { Tables } from "@/integrations/supabase/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const taskSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]),
  due_date: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function Tasks() {
  const { t } = useLanguage();
  const { user, loading, companyId, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  type TaskWithJoins = Tables<"tasks"> & {
    employees?: { full_name: string } | null;
  };
  const [tasks, setTasks] = useState<TaskWithJoins[]>([]);
  const [employees, setEmployees] = useState<Tables<"employees">[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string | null>(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "medium",
      status: "pending",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchEmployeeId();
      fetchData();
    }
  }, [user, loading, navigate, companyId]);

  const fetchEmployeeId = async () => {
    if (!user?.email || !companyId) return;

    console.log("🔍 [Tasks] Looking up Employee ID for:", user.email);

    // Find employee by email
    const { data: empByEmail } = await supabase
      .from("employees")
      .select("id, full_name")
      .ilike("email", user.email)
      .eq("company_id", companyId)
      .maybeSingle();

    if (empByEmail) {
      console.log("✅ [Tasks] Found Employee ID:", empByEmail.id);
      setCurrentEmployeeId(empByEmail.id);
      setCurrentEmployeeName(empByEmail.full_name);
    } else {
      console.log("⚠️ [Tasks] No employee record found for this user");
    }
  };

  const fetchData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      // PostgREST caps unranged selects at 1000 rows - loop with .range()
      // until a page comes back short, otherwise companies with >1000
      // tasks or employees would silently see only the first 1000.
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

      const [tasksData, employeesData] = await Promise.all([
        fetchAllPages<TaskWithJoins>((from, to) =>
          supabase
            .from("tasks")
            .select("*, employees!tasks_assigned_to_fkey(full_name)")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .range(from, to)
        ),
        fetchAllPages<Tables<"employees">>((from, to) =>
          supabase.from("employees").select("*").eq("company_id", companyId).range(from, to)
        ),
      ]);

      setTasks(tasksData);
      setEmployees(employeesData);
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Ladefehler",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Echtzeit-Sync: Aufgaben
  useRealtimeRefetch(["tasks"], companyId, fetchData);

  const onSubmit = async (data: TaskFormData) => {
    if (!companyId) return;

    try {
      // Insert task and get the created record back
      const { data: insertedRows, error } = await supabase
        .from("tasks")
        .insert([
          {
            title: data.title,
            description: data.description,
            assigned_to: data.assigned_to,
            priority: data.priority,
            status: data.status,
            due_date: data.due_date,
            company_id: companyId,
          },
        ])
        .select("id, title, description")
        .single();

      if (error) throw error;

      // ── Get sender display name ───────────────────────────────────────────
      let senderName = user?.email || "Someone";
      if (user?.email) {
        const { data: senderEmp } = await supabase
          .from("employees")
          .select("full_name")
          .ilike("email", user.email)
          .eq("company_id", companyId)
          .maybeSingle();
        if (senderEmp?.full_name) {
          senderName = senderEmp.full_name;
        } else {
          const { data: senderMember } = await supabase
            .from("team_members")
            .select("first_name, last_name")
            .ilike("email", user.email)
            .eq("company_id", companyId)
            .maybeSingle();
          if (senderMember) {
            senderName = `${senderMember.first_name} ${senderMember.last_name}`.trim();
          }
        }
      }

      // ── Send mention + assignment notifications via SECURITY DEFINER RPC ──
      // This runs server-side bypassing all RLS, so it can always find users
      // regardless of which table (employees vs team_members) they live in.
      const combinedText = `${insertedRows.title || ""} ${insertedRows.description || ""}`;
      const { data: notifCount, error: notifErr } = await supabase.rpc(
        "notify_task_mentions",
        {
          p_company_id:  companyId,
          p_task_id:     insertedRows.id,
          p_task_title:  insertedRows.title,
          p_task_text:   combinedText,
          p_sender_name: senderName,
          p_assigned_to: data.assigned_to ?? null,
        }
      );
      if (notifErr) {
        console.error("❌ Task notification RPC error:", notifErr);
      } else {
        console.log(`✅ Task notifications sent: ${notifCount}`);
      }
      // ─────────────────────────────────────────────────────────────────────

      // Log audit action for task creation
      console.log("🔵 [TASK LOG] Starting audit log creation...");
      console.log("🔵 [TASK LOG] Parameters:", {
        task_id: insertedRows.id,
        task_title: insertedRows.title,
        company_id: companyId,
        assignee: data.assigned_to
      });
      
      try {
        const { data: logResult, error: logError } = await supabase.rpc("create_audit_log", {
          p_action_type: "assign_task",
          p_target_type: "task",
          p_target_id: insertedRows.id,
          p_target_name: insertedRows.title,
          p_details: {
            assignee_id: data.assigned_to,
            priority: data.priority,
            status: data.status,
            due_date: data.due_date
          },
          p_company_id: companyId,
        });
        
        if (logError) {
          console.error("❌ [TASK LOG] RPC Error:", logError);
        } else {
          console.log("✅ [TASK LOG] Created! Log ID:", logResult);
          
          // Verify the log was created
          const { data: verifyLog } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("id", logResult)
            .single();
          console.log("🔍 [TASK LOG] Verification:", verifyLog);
        }
      } catch (auditErr) {
        console.error("❌ [TASK LOG] Exception:", auditErr);
      }

      toast({ title: "Gespeichert", description: "Aufgabe wurde erstellt" });
      setIsDialogOpen(false);
      form.reset();
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Admins und company_admin sehen alle Tasks; normale User nur ihre eigenen
  const isAdmin = userRole === "company_admin" || userRole === "super_admin";

  // Apply task visibility filtering
  const visibleTasks = tasks.filter((task) => {
    // 1. Direkt zugewiesen → immer sichtbar
    if (currentEmployeeId && task.assigned_to === currentEmployeeId) return true;

    // 2. User ist im Titel oder in der Beschreibung @erwähnt
    if (currentEmployeeName) {
      const nameLower = currentEmployeeName.toLowerCase();
      const title = (task.title || "").toLowerCase();
      const desc = (task.description || "").toLowerCase();
      if (title.includes(`@${nameLower}`) || desc.includes(`@${nameLower}`)) {
        return true;
      }
    }

    // 3. Nicht zugewiesene Tasks → nur für Admins sichtbar
    if (!task.assigned_to && isAdmin) return true;

    // 4. Admins sehen alle Tasks (z.B. um den Überblick zu behalten)
    if (isAdmin) return true;

    return false;
  });

  // Apply search filter on top of visibility filter
  const filteredTasks = visibleTasks.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // @mention autocomplete handlers
  const handleDescriptionChange = (
    value: string,
    onChange: (val: string) => void
  ) => {
    onChange(value);
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(atIndex);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const selectMention = (
    employee: Tables<"employees">,
    currentValue: string,
    onChange: (val: string) => void
  ) => {
    const before = currentValue.substring(0, mentionStartIndex);
    const after = currentValue.substring(
      mentionStartIndex + 1 + mentionQuery.length
    );
    const newValue = `${before}@${employee.full_name} ${after}`;
    onChange(newValue);
    setShowMentionDropdown(false);
    setMentionQuery("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const filteredMentions = employees.filter((emp) =>
    emp.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "secondary";
      case "in_progress":
        return "default";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Tasks</h1>
              <p className="text-xs text-muted-foreground">Task Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Track and manage safety tasks</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Task</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Description{" "}
                              <span className="text-xs text-muted-foreground font-normal">
                                (type @ to mention an employee — mentioned person sees this task only)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Textarea
                                  {...field}
                                  ref={textareaRef}
                                  rows={3}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    handleDescriptionChange(
                                      e.target.value,
                                      field.onChange
                                    )
                                  }
                                  placeholder="Describe the task... Use @Name to assign visibility to a specific person"
                                />
                                {showMentionDropdown &&
                                  filteredMentions.length > 0 && (
                                    <div className="absolute z-50 w-64 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                                      {filteredMentions.map((emp) => (
                                        <button
                                          key={emp.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            selectMention(
                                              emp,
                                              field.value ?? "",
                                              field.onChange
                                            );
                                          }}
                                        >
                                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                                            {emp.full_name.charAt(0).toUpperCase()}
                                          </span>
                                          {emp.full_name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="assigned_to"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign To</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Mitarbeiter auswählen" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {emp.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="due_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {field.value ? (
                                        format(new Date(field.value), "PPP")
                                      ) : (
                                        <span>{t("common.pickDate")}</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={field.value ? new Date(field.value) : undefined}
                                      onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pending">
                                    Pending
                                  </SelectItem>
                                  <SelectItem value="in_progress">
                                    In Progress
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    Completed
                                  </SelectItem>
                                  <SelectItem value="overdue">
                                    Overdue
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Create Task</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          {task.employees?.full_name || "Nicht zugewiesen"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(task.status)}>
                            {task.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.due_date || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
