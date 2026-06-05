import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Receipt,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  Building2,
  Search,
  Download,
  Mail,
  Send,
  Eye,
  CreditCard,
  AlertCircle,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Filter,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Invoice, InvoiceStatus, LineItem } from "@/pages/Invoices";
import { useAuditLog } from "@/hooks/useAuditLog";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CompanyRow {
  id: string;
  name: string;
  email: string;
  billing_email: string | null;
  subscription_tier: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface InvoiceWithCompany extends Invoice {
  company: CompanyRow;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
function fmt(amount: number, currency = "EUR") {
  return `${CURRENCY_SYMBOLS[currency] ?? currency + " "}${Number(amount).toFixed(2)}`;
}
function fmtDate(d: string | null | undefined, fb = "—") {
  if (!d) return fb;
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return fb; }
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
    pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
    overdue: { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200", icon: <AlertTriangle className="w-3 h-3" /> },
    cancelled: { label: "Cancelled", className: "bg-gray-50 text-gray-600 border-gray-200", icon: <XCircle className="w-3 h-3" /> },
    draft: { label: "Draft", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <FileText className="w-3 h-3" /> },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  );
}

function StripeStatus({ company }: { company: CompanyRow }) {
  const connected = !!(company.stripe_customer_id || company.stripe_subscription_id);
  return connected ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Connected
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Customer: {company.stripe_customer_id ?? "—"}</p>
          <p className="text-xs">Subscription: {company.stripe_subscription_id ?? "—"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <AlertCircle className="w-3.5 h-3.5" /> Not linked
    </span>
  );
}

function generateInvoicePDF(invoice: InvoiceWithCompany) {
  const doc = new jsPDF();
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency + " ";
  const companyName = invoice.company?.name ?? "Company";

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 14, 24);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoice_number, 14, 32);
  doc.text(companyName, 196, 16, { align: "right" });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 196, 24, { align: "right" });
  if (invoice.due_date) doc.text(`Due: ${fmtDate(invoice.due_date)}`, 196, 32, { align: "right" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let y = 52;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Details", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  const meta: [string, string][] = [
    ["Invoice Number:", invoice.invoice_number],
    ["Company:", companyName],
    ["Issue Date:", fmtDate(invoice.created_at)],
    ...(invoice.due_date ? [["Due Date:", fmtDate(invoice.due_date)] as [string, string]] : []),
  ];
  meta.forEach(([l, v]) => { doc.text(l, 14, y); doc.text(v, 60, y); y += 5; });
  y += 4;

  const lineItems = Array.isArray(invoice.line_items) && invoice.line_items.length > 0
    ? invoice.line_items
    : [{ description: "HSE Management Platform – Monthly Subscription", quantity: 1, unit_price: invoice.subtotal, total: invoice.subtotal }];

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: lineItems.map((i: LineItem) => [i.description, i.quantity.toString(), `${sym}${i.unit_price.toFixed(2)}`, `${sym}${i.total.toFixed(2)}`]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { cellWidth: 18, halign: "center" }, 2: { cellWidth: 30, halign: "right" }, 3: { cellWidth: 30, halign: "right" } },
    theme: "striped",
    alternateRowStyles: { fillColor: [245, 247, 255] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ty = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.text("Subtotal:", 130, ty);
  doc.text(`${sym}${invoice.subtotal.toFixed(2)}`, 196, ty, { align: "right" });
  ty += 5;
  if (invoice.tax_amount > 0) {
    doc.text("Tax:", 130, ty);
    doc.text(`${sym}${invoice.tax_amount.toFixed(2)}`, 196, ty, { align: "right" });
    ty += 5;
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(130, ty, 196, ty);
  ty += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total:", 130, ty);
  doc.text(`${sym}${invoice.total.toFixed(2)}`, 196, ty, { align: "right" });

  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by HSE Safety Hub (Super Admin)", 105, pageH - 10, { align: "center" });
  doc.save(`${invoice.invoice_number}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function SuperAdminInvoices() {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const [invoices, setInvoices] = useState<InvoiceWithCompany[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sort
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Detail dialog
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCompany | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<InvoiceWithCompany | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && userRole !== "super_admin") {
      navigate("/dashboard");
    }
  }, [authLoading, userRole, navigate]);

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [invRes, compRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("companies")
          .select("id, name, email, billing_email, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id")
          .order("name"),
      ]);
      if (invRes.error) throw invRes.error;
      if (compRes.error) throw compRes.error;

      const compMap: Record<string, CompanyRow> = {};
      (compRes.data ?? []).forEach((c: CompanyRow) => { compMap[c.id] = c; });
      setCompanies(compRes.data ?? []);
      const merged: InvoiceWithCompany[] = (invRes.data ?? []).map((inv: Invoice) => ({
        ...inv,
        company: compMap[inv.company_id] ?? { id: inv.company_id, name: "Unknown", email: "", billing_email: null, subscription_tier: "basic", subscription_status: "inactive", stripe_customer_id: null, stripe_subscription_id: null },
      }));
      setInvoices(merged);
    } catch (err: unknown) {
      toast({ title: "Failed to load invoices", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + i.total, 0);
    const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
    const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0);
    const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.total, 0);
    const stripeConnected = companies.filter(c => c.stripe_customer_id).length;
    return { total, paid, overdue, pending, stripeConnected, totalCompanies: companies.length };
  }, [invoices, companies]);

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...invoices];
    if (filterCompany !== "all") list = list.filter(i => i.company_id === filterCompany);
    if (filterStatus !== "all") list = list.filter(i => i.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.company?.name.toLowerCase().includes(q) ||
        i.company?.email.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const va: string | number = sortField === "total" ? a.total : sortField === "company" ? (a.company?.name ?? "") : (a as unknown as Record<string, unknown>)[sortField] as string ?? "";
      const vb: string | number = sortField === "total" ? b.total : sortField === "company" ? (b.company?.name ?? "") : (b as unknown as Record<string, unknown>)[sortField] as string ?? "";
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [invoices, filterCompany, filterStatus, search, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (field === sortField) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortTh = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => {
    const active = field === sortField;
    return (
      <TableHead className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className ?? ""}`} onClick={() => handleSort(field)}>
        <span className="inline-flex items-center gap-1">
          {children}
          {active ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 opacity-60" /> : <ChevronDown className="w-3 h-3 opacity-60" />) : <ChevronDown className="w-3 h-3 opacity-20" />}
        </span>
      </TableHead>
    );
  };

  // ── Send Invoice ─────────────────────────────────────────────────────────
  const handleSendClick = (inv: InvoiceWithCompany) => {
    setSendTarget(inv);
    setSendEmail(inv.company?.billing_email ?? inv.company?.email ?? "");
    setSendDialogOpen(true);
  };

  const handleSendConfirm = async () => {
    if (!sendTarget || !sendEmail) return;
    setSendLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: { invoice_id: sendTarget.id, recipient_email: sendEmail, recipient_name: sendTarget.company?.name ?? "Client" },
      });
      if (error || !data?.success) throw new Error(error?.message ?? data?.error ?? "Send failed");
      await logAction({
        action: "send_invoice",
        targetType: "invoice",
        targetId: sendTarget.id,
        targetName: sendTarget.invoice_number,
        companyIdOverride: sendTarget.company_id,
        details: {
          recipient_email: sendEmail,
          source: "super_admin",
        },
      });
      toast({ title: "Invoice sent!", description: `${sendTarget.invoice_number} emailed to ${sendEmail}.` });
      setSendDialogOpen(false);
      setDetailOpen(false);
      fetchData(true);
    } catch (err: unknown) {
      toast({ title: "Failed to send invoice", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setSendLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            All Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and manage invoices across all companies
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950"><DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">${stats.paid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoices.filter(i => i.status === "paid").length} paid</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950"><Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${stats.pending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoices.filter(i => i.status === "pending").length} pending</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <div className="p-1.5 rounded-md bg-red-50 dark:bg-red-950"><AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${stats.overdue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoices.filter(i => i.status === "overdue").length} overdue</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stripe</CardTitle>
            <div className="p-1.5 rounded-md bg-violet-50 dark:bg-violet-950"><CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stripeConnected}/{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">companies connected</p>
          </CardContent>
        </Card>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>All invoices across all companies. {filtered.length} shown.</CardDescription>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9"
                placeholder="Search invoice # or company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="h-9 w-[180px]">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-[140px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">No invoices found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || filterCompany !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters."
                  : "Invoices will appear here once billing cycles begin or Stripe webhooks sync."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortTh field="invoice_number">Invoice #</SortTh>
                    <SortTh field="company">Company</SortTh>
                    <SortTh field="created_at">Date</SortTh>
                    <SortTh field="due_date">Due</SortTh>
                    <SortTh field="total" className="text-right">Amount</SortTh>
                    <SortTh field="status">Status</SortTh>
                    <TableHead>Stripe</TableHead>
                    <TableHead className="text-right w-[110px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(invoice => (
                    <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-muted"><FileText className="w-3.5 h-3.5 text-muted-foreground" /></div>
                          <span className="font-mono text-sm font-medium">{invoice.invoice_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {invoice.company?.name?.charAt(0) ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[160px]">{invoice.company?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground capitalize">{invoice.company?.subscription_tier}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(invoice.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(invoice.due_date)}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmt(invoice.total, invoice.currency)}</TableCell>
                      <TableCell><StatusBadge status={invoice.status} /></TableCell>
                      <TableCell><StripeStatus company={invoice.company} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    void logAction({
                      action: "view",
                      targetType: "invoice",
                      targetId: invoice.id,
                      targetName: invoice.invoice_number,
                      companyIdOverride: invoice.company_id,
                      details: { source: "super_admin" },
                    });
                    setSelectedInvoice(invoice);
                    setDetailOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSendClick(invoice)}>
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send by email</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    void logAction({
                      action: "download_invoice",
                      targetType: "invoice",
                      targetId: invoice.id,
                      targetName: invoice.invoice_number,
                      companyIdOverride: invoice.company_id,
                      details: { source: "super_admin" },
                    });
                    generateInvoicePDF(invoice);
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download PDF</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedInvoice && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {selectedInvoice.invoice_number}
              </DialogTitle>
              <DialogDescription>
                {selectedInvoice.company?.name} · Issued {fmtDate(selectedInvoice.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-lg text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1"><StatusBadge status={selectedInvoice.status} /></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium mt-1">{selectedInvoice.company?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stripe</p>
                <div className="mt-1"><StripeStatus company={selectedInvoice.company} /></div>
              </div>
              {selectedInvoice.billing_period_start && selectedInvoice.billing_period_end && (
                <div>
                  <p className="text-xs text-muted-foreground">Billing Period</p>
                  <p className="font-medium mt-1 text-xs">{fmtDate(selectedInvoice.billing_period_start)} – {fmtDate(selectedInvoice.billing_period_end)}</p>
                </div>
              )}
              {selectedInvoice.paid_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Paid On</p>
                  <p className="font-medium mt-1">{fmtDate(selectedInvoice.paid_at)}</p>
                </div>
              )}
              {selectedInvoice.due_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-medium mt-1">{fmtDate(selectedInvoice.due_date)}</p>
                </div>
              )}
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16 text-center">Qty</TableHead>
                    <TableHead className="w-28 text-right">Unit Price</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(selectedInvoice.line_items) && selectedInvoice.line_items.length > 0
                    ? selectedInvoice.line_items
                    : [{ description: "HSE Management Platform – Monthly Subscription", quantity: 1, unit_price: selectedInvoice.subtotal, total: selectedInvoice.subtotal }]
                  ).map((item: LineItem, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{CURRENCY_SYMBOLS[selectedInvoice.currency] ?? "$"}{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{CURRENCY_SYMBOLS[selectedInvoice.currency] ?? "$"}{item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8 text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmt(selectedInvoice.subtotal, selectedInvoice.currency)}</span>
              </div>
              {selectedInvoice.tax_amount > 0 && (
                <div className="flex gap-8 text-muted-foreground">
                  <span>Tax</span>
                  <span>{fmt(selectedInvoice.tax_amount, selectedInvoice.currency)}</span>
                </div>
              )}
              <Separator className="w-48 my-1" />
              <div className="flex gap-8 font-bold text-base">
                <span>Total</span>
                <span>{fmt(selectedInvoice.total, selectedInvoice.currency)}</span>
              </div>
            </div>

            {(selectedInvoice.metadata as Record<string, unknown>)?.last_sent_at && (
              <p className="text-xs text-muted-foreground">
                Last sent to <span className="font-medium">{String((selectedInvoice.metadata as Record<string, unknown>).last_sent_to)}</span>{" "}
                on {fmtDate(String((selectedInvoice.metadata as Record<string, unknown>).last_sent_at))}
                {(selectedInvoice.metadata as Record<string, unknown>).sent_count
                  ? ` · ${(selectedInvoice.metadata as Record<string, unknown>).sent_count}× total`
                  : ""}
              </p>
            )}

            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              {(selectedInvoice.metadata as Record<string, unknown>)?.stripe_hosted_url && (
                <Button variant="outline" onClick={() => window.open(String((selectedInvoice.metadata as Record<string, string>).stripe_hosted_url), "_blank")}>
                  <ExternalLink className="w-4 h-4 mr-2" />Stripe Invoice
                </Button>
              )}
        <Button
          variant="outline"
          onClick={() => {
            if (selectedInvoice) {
              void logAction({
                action: "download_invoice",
                targetType: "invoice",
                targetId: selectedInvoice.id,
                targetName: selectedInvoice.invoice_number,
                companyIdOverride: selectedInvoice.company_id,
                details: { source: "super_admin_detail" },
              });
              generateInvoicePDF(selectedInvoice);
            }
          }}
        >
                <Download className="w-4 h-4 mr-2" />Download PDF
              </Button>
              <Button onClick={() => handleSendClick(selectedInvoice)} disabled={sendLoading}>
                {sendLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Send Invoice by Email
            </DialogTitle>
            <DialogDescription>
              {sendTarget?.invoice_number} from <strong>{sendTarget?.company?.name}</strong> will be sent as a formatted email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sa-send-email">Recipient Email</Label>
              <Input
                id="sa-send-email"
                type="email"
                value={sendEmail}
                onChange={e => setSendEmail(e.target.value)}
                placeholder="client@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Defaults to the company's billing email. Override as needed.
              </p>
            </div>
            {sendTarget && (
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{fmt(sendTarget.total, sendTarget.currency)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sendLoading}>Cancel</Button>
            <Button onClick={handleSendConfirm} disabled={sendLoading || !sendEmail}>
              {sendLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
