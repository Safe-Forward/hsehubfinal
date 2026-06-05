import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_PAYMENT_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Shield,
  Package,
  Star,
  Sparkles,
  Eye,
  Loader2,
  XCircle,
  ChevronUp,
  ChevronDown,
  Receipt,
  Building2,
  ExternalLink,
  Mail,
  Send,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, addDays, isBefore } from "date-fns";
import { useAuditLog } from "@/hooks/useAuditLog";


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  line_items: LineItem[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompanyBillingInfo {
  id: string;
  name: string;
  email: string;
  subscription_tier: "basic" | "standard" | "premium";
  subscription_status: "active" | "inactive" | "cancelled" | "trial";
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_ends_at: string | null;
  subscription_billing_interval: "month" | "year" | null;
  billing_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

type PlanTier = "basic" | "standard" | "premium";
type BillingInterval = "monthly" | "yearly";

interface PendingStripeCheckout {
  companyId: string;
  tier: PlanTier;
  interval: BillingInterval;
  startedAt: string;
  previousTier: PlanTier | null;
  previousStatus: CompanyBillingInfo["subscription_status"] | null;
  previousSubscriptionId: string | null;
  previousEndDate: string | null;
}

type SortField = "invoice_number" | "created_at" | "due_date" | "total" | "status";
type SortDir = "asc" | "desc";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  basic: 149,
  standard: 249,
  premium: 349,
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

const STRIPE_CHECKOUT_PENDING_KEY = "stripe_checkout_pending";
const CHECKOUT_PENDING_TIMEOUT_MS = 45 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Helper utils
// ─────────────────────────────────────────────────────────────────────────────
function fmt(amount: number, currency = "EUR") {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return `${sym}${amount.toFixed(2)}`;
}

function fmtDate(dateStr: string | null | undefined, fallback = "—") {
  if (!dateStr) return fallback;
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return fallback;
  }
}

function billingIntervalLabel(interval: "month" | "year" | null | undefined) {
  return interval === "year" ? "Yearly" : "Monthly";
}

function readPendingCheckout(): PendingStripeCheckout | null {
  try {
    const raw = localStorage.getItem(STRIPE_CHECKOUT_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingStripeCheckout;
    if (!parsed.companyId || !parsed.tier || !parsed.interval || !parsed.startedAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePendingCheckout(payload: PendingStripeCheckout) {
  localStorage.setItem(STRIPE_CHECKOUT_PENDING_KEY, JSON.stringify(payload));
}

function clearPendingCheckout() {
  localStorage.removeItem(STRIPE_CHECKOUT_PENDING_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice status helpers
// ─────────────────────────────────────────────────────────────────────────────
function getStatusConfig(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: "Paid",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "pending":
      return {
        icon: <Clock className="w-3.5 h-3.5" />,
        label: "Pending",
        className:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
      };
    case "overdue":
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        label: "Overdue",
        className:
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
      };
    case "cancelled":
      return {
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: "Cancelled",
        className:
          "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
      };
    case "draft":
    default:
      return {
        icon: <FileText className="w-3.5 h-3.5" />,
        label: "Draft",
        className:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
      };
  }
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generator
// ─────────────────────────────────────────────────────────────────────────────
function generateInvoicePDF(invoice: Invoice, companyName: string) {
  const doc = new jsPDF();
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency + " ";

  // Header bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 14, 24);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoice_number, 14, 32);

  // Right side header
  const rightX = 196;
  doc.text(companyName, rightX, 16, { align: "right" });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, rightX, 24, { align: "right" });
  if (invoice.due_date) {
    doc.text(`Due: ${fmtDate(invoice.due_date)}`, rightX, 32, { align: "right" });
  }

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  let y = 52;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Details", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  const metaRows: [string, string][] = [
    ["Invoice Number:", invoice.invoice_number],
    ["Issue Date:", fmtDate(invoice.created_at)],
    ...(invoice.due_date ? [["Due Date:", fmtDate(invoice.due_date)] as [string, string]] : []),
    ...(invoice.billing_period_start && invoice.billing_period_end
      ? [["Billing Period:", `${fmtDate(invoice.billing_period_start)} – ${fmtDate(invoice.billing_period_end)}`] as [string, string]]
      : []),
    ...(invoice.paid_at ? [["Paid On:", fmtDate(invoice.paid_at)] as [string, string]] : []),
    ...(invoice.payment_method ? [["Payment Method:", invoice.payment_method] as [string, string]] : []),
  ];
  metaRows.forEach(([label, value]) => {
    doc.text(label, 14, y);
    doc.text(value, 50, y);
    y += 5;
  });
  y += 4;

  const lineItems =
    Array.isArray(invoice.line_items) && invoice.line_items.length > 0
      ? invoice.line_items
      : [{ description: "HSE Management Platform - Monthly Subscription", quantity: 1, unit_price: invoice.subtotal, total: invoice.subtotal }];

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: lineItems.map((item) => [
      item.description,
      item.quantity.toString(),
      `${sym}${item.unit_price.toFixed(2)}`,
      `${sym}${item.total.toFixed(2)}`,
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
    theme: "striped",
    alternateRowStyles: { fillColor: [245, 247, 255] },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY + 8;
  let ty = afterTableY;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
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

  if (invoice.notes) {
    ty += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Notes:", 14, ty);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(invoice.notes, 14, ty + 5, { maxWidth: 180 });
    doc.setTextColor(30, 30, 30);
  }

  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by HSE Safety Hub", 105, pageH - 10, { align: "center" });
  doc.text(format(new Date(), "PPP"), 105, pageH - 5, { align: "center" });
  doc.save(`${invoice.invoice_number}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription plan card
// ─────────────────────────────────────────────────────────────────────────────
function SubscriptionCard({
  company,
  onManageBilling,
  onUpgrade,
  billingLoading,
}: {
  company: CompanyBillingInfo;
  onManageBilling: () => void;
  onUpgrade: (tier: PlanTier, interval: BillingInterval) => void;
  billingLoading: boolean;
}) {
  const tier = company.subscription_tier ?? "basic";
  const status = company.subscription_status ?? "trial";
  const price = PLAN_PRICES[tier] ?? 0;
  const isTrialing = status === "trial";
  const isCancelled = status === "cancelled";
  const isInactive = status === "inactive";
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(
    company.subscription_billing_interval === "year" ? "yearly" : "monthly"
  );

  const trialEnd = company.trial_ends_at ? new Date(company.trial_ends_at) : null;
  const daysUntilTrialEnd = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null;

  const planIcons: Record<string, React.ReactNode> = {
    basic: <Package className="w-5 h-5" />,
    standard: <Star className="w-5 h-5" />,
    premium: <Sparkles className="w-5 h-5" />,
  };

  const planGradients: Record<string, string> = {
    basic: "from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800",
    standard: "from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-800",
    premium: "from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800",
  };

  const planIconColors: Record<string, string> = {
    basic: "text-blue-600 dark:text-blue-400",
    standard: "text-violet-600 dark:text-violet-400",
    premium: "text-amber-600 dark:text-amber-400",
  };

  const statusBadge = (() => {
    if (status === "active")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      );
    if (status === "trial")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          <Zap className="w-3 h-3" /> Trial
        </span>
      );
    if (status === "cancelled")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <XCircle className="w-3 h-3" /> Cancelled
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
        <AlertCircle className="w-3 h-3" /> Inactive
      </span>
    );
  })();

  return (
    <Card className={`bg-gradient-to-br ${planGradients[tier]} border h-full`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${planIconColors[tier]}`}>
              {planIcons[tier]}
            </div>
            <div>
              <CardTitle className="text-base">{PLAN_LABELS[tier]} Plan</CardTitle>
              <CardDescription className="text-xs mt-0.5">{company.name}</CardDescription>
            </div>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold">€{price}</span>
          <span className="text-sm text-muted-foreground mb-1">
            /{company.subscription_billing_interval === "year" ? "year" : "month"}
          </span>
        </div>
        <Separator className="opacity-50" />
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {company.subscription_start_date && (
            <div className="flex justify-between">
              <span>Started</span>
              <span className="font-medium text-foreground">{fmtDate(company.subscription_start_date)}</span>
            </div>
          )}
          {company.subscription_billing_interval && (
            <div className="flex justify-between">
              <span>Billing cycle</span>
              <span className="font-medium text-foreground">
                {billingIntervalLabel(company.subscription_billing_interval)}
              </span>
            </div>
          )}
          {company.subscription_end_date && !isCancelled && (
            <div className="flex justify-between">
              <span>Renews</span>
              <span className="font-medium text-foreground">{fmtDate(company.subscription_end_date)}</span>
            </div>
          )}
          {isCancelled && company.subscription_end_date && (
            <div className="flex justify-between">
              <span>Access until</span>
              <span className="font-medium text-red-600 dark:text-red-400">{fmtDate(company.subscription_end_date)}</span>
            </div>
          )}
          {isTrialing && daysUntilTrialEnd !== null && (
            <div className="flex justify-between">
              <span>Trial ends</span>
              <span className={`font-medium ${daysUntilTrialEnd <= 3 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                {daysUntilTrialEnd === 0 ? "Today" : `${daysUntilTrialEnd}d left`}
              </span>
            </div>
          )}
          {company.billing_email && (
            <div className="flex justify-between gap-2">
              <span className="shrink-0">Billing email</span>
              <span className="font-medium text-foreground truncate">{company.billing_email}</span>
            </div>
          )}
        </div>
        {(isTrialing || isCancelled || isInactive) && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={selectedInterval === "monthly" ? "default" : "outline"}
                onClick={() => setSelectedInterval("monthly")}
                disabled={billingLoading}
              >
                Monthly
              </Button>
              <Button
                size="sm"
                variant={selectedInterval === "yearly" ? "default" : "outline"}
                onClick={() => setSelectedInterval("yearly")}
                disabled={billingLoading}
              >
                Yearly
              </Button>
            </div>

            <div className="grid gap-2">
              {(["basic", "standard", "premium"] as const).map((targetTier) => (
                <Button
                  key={targetTier}
                  size="sm"
                  variant={targetTier === tier ? "default" : "outline"}
                  className="w-full"
                  onClick={() => onUpgrade(targetTier, selectedInterval)}
                  disabled={billingLoading}
                >
                  {billingLoading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {`Choose ${PLAN_LABELS[targetTier]} (${selectedInterval === "yearly" ? "Yearly" : "Monthly"})`}
                </Button>
              ))}
            </div>
          </div>
        )}
        {!isTrialing && !isCancelled && !isInactive && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-1"
            onClick={onManageBilling}
            disabled={billingLoading}
          >
            {billingLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5 mr-1.5" />}
            Manage Billing
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice detail dialog
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceDetailDialog({
  invoice,
  companyName,
  open,
  onOpenChange,
  onSend,
  sendLoading,
}: {
  invoice: Invoice | null;
  companyName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSend: (inv: Invoice) => void;
  sendLoading: boolean;
}) {
  if (!invoice) return null;
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency + " ";
  const lineItems =
    Array.isArray(invoice.line_items) && invoice.line_items.length > 0
      ? invoice.line_items
      : [{ description: "HSE Management Platform - Monthly Subscription", quantity: 1, unit_price: invoice.subtotal, total: invoice.subtotal }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription>
            Issued {fmtDate(invoice.created_at)}
            {invoice.due_date ? ` · Due ${fmtDate(invoice.due_date)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-lg text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
          {invoice.billing_period_start && invoice.billing_period_end && (
            <div>
              <p className="text-xs text-muted-foreground">Billing Period</p>
              <p className="font-medium mt-1 text-xs">
                {fmtDate(invoice.billing_period_start)} – {fmtDate(invoice.billing_period_end)}
              </p>
            </div>
          )}
          {invoice.paid_at && (
            <div>
              <p className="text-xs text-muted-foreground">Paid On</p>
              <p className="font-medium mt-1">{fmtDate(invoice.paid_at)}</p>
            </div>
          )}
          {invoice.payment_method && (
            <div>
              <p className="text-xs text-muted-foreground">Payment Method</p>
              <p className="font-medium mt-1 capitalize">{invoice.payment_method}</p>
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
              {lineItems.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.description}</TableCell>
                  <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm">
                    {sym}{item.unit_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {sym}{item.total.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8 text-muted-foreground">
            <span>Subtotal</span>
            <span>{sym}{invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.tax_amount > 0 && (
            <div className="flex gap-8 text-muted-foreground">
              <span>Tax</span>
              <span>{sym}{invoice.tax_amount.toFixed(2)}</span>
            </div>
          )}
          <Separator className="w-48 my-1" />
          <div className="flex gap-8 font-bold text-base">
            <span>Total</span>
            <span>{sym}{invoice.total.toFixed(2)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
            <span className="font-medium">Notes: </span>{invoice.notes}
          </div>
        )}

        {/* send tracking */}
        {(invoice.metadata as Record<string, unknown>)?.last_sent_at && (
          <p className="text-xs text-muted-foreground">
            Last sent to <span className="font-medium">{String((invoice.metadata as Record<string, unknown>).last_sent_to)}</span>{" "}
            on {fmtDate(String((invoice.metadata as Record<string, unknown>).last_sent_at))}
            {(invoice.metadata as Record<string, unknown>).sent_count ? ` · ${(invoice.metadata as Record<string, unknown>).sent_count}× total` : ""}
          </p>
        )}
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {(invoice.metadata as Record<string, unknown>)?.stripe_hosted_url && (
            <Button
              variant="outline"
              onClick={() => window.open((invoice.metadata as Record<string, string>).stripe_hosted_url, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Stripe Invoice
            </Button>
          )}
          <Button variant="outline" onClick={() => generateInvoicePDF(invoice, companyName)}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={() => onSend(invoice)} disabled={sendLoading}>
            {sendLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable table header
// ─────────────────────────────────────────────────────────────────────────────
function SortableTh({
  field,
  currentField,
  dir,
  onClick,
  children,
  className,
}: {
  field: SortField;
  currentField: SortField;
  dir: SortDir;
  onClick: (f: SortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = field === currentField;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className ?? ""}`}
      onClick={() => onClick(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="w-3 h-3 opacity-60" />
          ) : (
            <ChevronDown className="w-3 h-3 opacity-60" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 opacity-20" />
        )}
      </span>
    </TableHead>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice table
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceTable({
  invoices,
  companyName,
  onView,
  onDownload,
  onSend,
  sendLoading,
}: {
  invoices: Invoice[];
  companyName: string;
  onView: (inv: Invoice) => void;
  onDownload: (inv: Invoice) => void;
  onSend: (inv: Invoice) => void;
  sendLoading: boolean;
}) {
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...invoices].sort((a, b) => {
      let va: string | number = sortField === "total" ? a.total : (a[sortField] ?? "");
      let vb: string | number = sortField === "total" ? b.total : (b[sortField] ?? "");
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [invoices, sortField, sortDir]);

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-muted-foreground">No invoices found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Invoices will appear here once billing cycles begin.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <SortableTh field="invoice_number" currentField={sortField} dir={sortDir} onClick={handleSort}>
              Invoice #
            </SortableTh>
            <SortableTh field="created_at" currentField={sortField} dir={sortDir} onClick={handleSort}>
              Date
            </SortableTh>
            <TableHead>Description</TableHead>
            <SortableTh field="due_date" currentField={sortField} dir={sortDir} onClick={handleSort}>
              Due Date
            </SortableTh>
            <SortableTh field="total" currentField={sortField} dir={sortDir} onClick={handleSort} className="text-right">
              Amount
            </SortableTh>
            <SortableTh field="status" currentField={sortField} dir={sortDir} onClick={handleSort}>
              Status
            </SortableTh>
            <TableHead className="text-right w-[110px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((invoice) => {
            const lineItems =
              Array.isArray(invoice.line_items) && invoice.line_items.length > 0
                ? invoice.line_items
                : null;
            const description = lineItems
              ? (lineItems[0]?.description ?? "Subscription")
              : "HSE Management Platform – Monthly Subscription";
            const isOverdueSoon =
              invoice.status === "pending" &&
              invoice.due_date &&
              isBefore(new Date(invoice.due_date), addDays(new Date(), 3));

            return (
              <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-muted">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="font-mono text-sm font-medium">{invoice.invoice_number}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {fmtDate(invoice.created_at)}
                </TableCell>
                <TableCell className="text-sm max-w-[200px]">
                  <span className="truncate block">{description}</span>
                  {lineItems && lineItems.length > 1 && (
                    <span className="text-xs text-muted-foreground">+{lineItems.length - 1} more items</span>
                  )}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {invoice.due_date ? (
                    <span
                      className={
                        isOverdueSoon
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {fmtDate(invoice.due_date)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">
                  {fmt(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(invoice)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View details</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSend(invoice)} disabled={sendLoading}>
                            {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send invoice by email</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDownload(invoice)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download PDF</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Methods tab
// ─────────────────────────────────────────────────────────────────────────────
function PaymentMethodsTab({
  company,
  onManageBilling,
  billingLoading,
}: {
  company: CompanyBillingInfo | null;
  onManageBilling: () => void;
  billingLoading: boolean;
}) {
  const hasStripe = !!(company?.stripe_customer_id || company?.stripe_subscription_id);

  return (
    <div className="space-y-4">
      {/* Stripe status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950">
                <CreditCard className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-sm">Payment Gateway</CardTitle>
                <CardDescription className="text-xs">Stripe – Secure payment processing</CardDescription>
              </div>
            </div>
            {hasStripe ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full">
                <AlertCircle className="w-3 h-3" /> Not configured
              </span>
            )}
          </div>
        </CardHeader>
        {company?.stripe_customer_id && (
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground font-mono bg-muted/40 px-3 py-2 rounded">
              Customer ID: {company.stripe_customer_id}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Saved card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Saved Payment Methods</CardTitle>
              <CardDescription className="text-xs">Cards and bank accounts on file</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onManageBilling} disabled={billingLoading}>
              {billingLoading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              )}
              {hasStripe ? "Manage Cards" : "Add Card"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasStripe ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded flex items-center justify-center shadow-sm">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                  <p className="text-xs text-muted-foreground">Visa · Expires 12/27</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">Default</Badge>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 rounded-full bg-muted mb-3">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No payment methods configured</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Payment methods are managed through the Stripe billing portal.
              </p>
              <Button size="sm" variant="outline" className="mt-3" onClick={onManageBilling} disabled={billingLoading}>
                {billingLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
                Set Up Billing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing contact */}
      {company?.billing_email && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Billing Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span>{company.billing_email}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices and billing notifications are sent to this address.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Security note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300">
        <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          All payment information is encrypted and processed securely through Stripe. HSE Safety Hub never stores your full card details.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function Invoices() {
  const { companyId, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftInvoiceAttemptedRef = useRef(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [company, setCompany] = useState<CompanyBillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "pending" | "overdue" | "payment-methods">("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<Invoice | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [stripeUnavailable, setStripeUnavailable] = useState(false);
  const [billingEmailDialogOpen, setBillingEmailDialogOpen] = useState(false);
  const [billingEmailInput, setBillingEmailInput] = useState("");
  const [savingBillingEmail, setSavingBillingEmail] = useState(false);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!companyId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [invoicesRes, companyResWithInterval] = await Promise.all([
          supabase
            .from("invoices")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false }),
          supabase
            .from("companies")
            .select(
              "id, name, email, subscription_tier, subscription_status, subscription_start_date, subscription_end_date, trial_ends_at, subscription_billing_interval, billing_email, stripe_customer_id, stripe_subscription_id"
            )
            .eq("id", companyId)
            .single(),
        ]);

        let companyRes = companyResWithInterval;

        if (companyResWithInterval.error) {
          const msg = String(companyResWithInterval.error.message ?? "").toLowerCase();
          const details = String(companyResWithInterval.error.details ?? "").toLowerCase();
          const intervalColumnMissing =
            companyResWithInterval.error.code === "PGRST204" ||
            msg.includes("subscription_billing_interval") ||
            details.includes("subscription_billing_interval");

          if (intervalColumnMissing) {
            const fallbackCompanyRes = await supabase
              .from("companies")
              .select(
                "id, name, email, subscription_tier, subscription_status, subscription_start_date, subscription_end_date, trial_ends_at, billing_email, stripe_customer_id, stripe_subscription_id"
              )
              .eq("id", companyId)
              .single();

            companyRes = {
              ...fallbackCompanyRes,
              data: fallbackCompanyRes.data
                ? {
                    ...fallbackCompanyRes.data,
                    subscription_billing_interval: null,
                  }
                : fallbackCompanyRes.data,
            } as typeof companyResWithInterval;
          }
        }

        if (invoicesRes.error) throw invoicesRes.error;
        if (companyRes.error) throw companyRes.error;

        const invoiceData = (invoicesRes.data ?? []) as Invoice[];
        const companyData = companyRes.data as CompanyBillingInfo;
        setInvoices(invoiceData);
        setCompany(companyData);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load billing data.";
        setError(msg);
        if (!silent) {
          toast({ title: "Error loading billing data", description: msg, variant: "destructive" });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, toast]
  );

  const autoCreateDraftInvoice = useCallback(
    async (comp: CompanyBillingInfo) => {
      if (!companyId) return;
      if (draftInvoiceAttemptedRef.current) return;
      if (comp.subscription_status !== "active" && comp.subscription_status !== "trial") return;

      draftInvoiceAttemptedRef.current = true;

      try {
        const tier = comp.subscription_tier ?? "basic";
        const price = PLAN_PRICES[tier] ?? PLAN_PRICES.basic;
        const now = new Date();
        const periodStart = comp.subscription_start_date
          ? new Date(comp.subscription_start_date)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        const dueDate = new Date(periodEnd);
        dueDate.setDate(dueDate.getDate() + 14);

        const { data: generatedInvoiceNumber, error: numberError } = await supabase.rpc("generate_invoice_number", {
          p_company_id: companyId,
        });

        const invoiceNum =
          typeof generatedInvoiceNumber === "string" && generatedInvoiceNumber
            ? generatedInvoiceNumber
            : `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-001`;

        if (numberError) {
          console.warn("Falling back to local invoice number generation:", numberError.message);
        }

        const { data: insertedInvoice, error } = await supabase.from("invoices").insert({
          company_id: companyId,
          invoice_number: invoiceNum,
          status: comp.subscription_status === "active" ? "pending" : "draft",
          subtotal: price,
          tax_amount: 0,
          total: price,
          currency: "EUR",
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          due_date: dueDate.toISOString(),
          line_items: [
            {
              description: `${PLAN_LABELS[tier]} Plan - HSE Safety Hub Subscription`,
              quantity: 1,
              unit_price: price,
              total: price,
            },
          ],
          notes: "Auto-generated invoice for the current subscription period.",
          metadata: { auto_generated: true, plan: tier, source: "ui_fallback" },
        }).select("id, invoice_number").single();

        if (error) throw error;

        await logAction({
          action: "create_draft_invoice",
          targetType: "invoice",
          targetId: insertedInvoice?.id ?? companyId,
          targetName: insertedInvoice?.invoice_number ?? invoiceNum,
          companyIdOverride: companyId,
          details: {
            plan: tier,
            status: comp.subscription_status === "active" ? "pending" : "draft",
            total: price,
            currency: "EUR",
            source: "ui_fallback",
          },
        });

        await fetchData(true);
      } catch (err) {
        console.error("Failed to auto-create draft invoice:", err);
      }
    },
    [companyId, fetchData, logAction]
  );

  useEffect(() => {
    if (!authLoading && companyId) {
      fetchData();
    } else if (!authLoading && !companyId) {
      setLoading(false);
    }
  }, [authLoading, companyId, fetchData]);

  useEffect(() => {
    if (!loading && company && invoices.length === 0) {
      autoCreateDraftInvoice(company);
    }
  }, [loading, company, invoices.length, autoCreateDraftInvoice]);

  // Handle Stripe checkout return
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (!checkoutStatus) return;

    if (checkoutStatus === "success") {
      clearPendingCheckout();
      toast({ title: "Subscription activated!", description: "Your plan has been updated. Refreshing billing data…" });
      fetchData(true);
      setSearchParams({}, { replace: true });
    } else if (checkoutStatus === "cancelled" || checkoutStatus === "canceled" || checkoutStatus === "failed") {
      clearPendingCheckout();
      toast({ title: "Checkout cancelled", description: "No changes were made.", variant: "destructive" });
      setSearchParams({}, { replace: true });
    }
  }, [fetchData, searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (!companyId || !company) return;

    const pending = readPendingCheckout();
    if (!pending || pending.companyId !== companyId) return;

    const startedAtMs = new Date(pending.startedAt).getTime();
    const hasTimedOut = Number.isFinite(startedAtMs)
      ? Date.now() - startedAtMs > CHECKOUT_PENDING_TIMEOUT_MS
      : false;

    const subscriptionChanged =
      company.subscription_tier !== pending.previousTier ||
      company.subscription_status !== pending.previousStatus ||
      company.stripe_subscription_id !== pending.previousSubscriptionId ||
      company.subscription_end_date !== pending.previousEndDate;

    if (company.subscription_status === "active" && subscriptionChanged) {
      clearPendingCheckout();
      toast({
        title: "Payment successful",
        description: `${PLAN_LABELS[company.subscription_tier]} ${pending.interval === "yearly" ? "yearly" : "monthly"} plan activated.`,
      });
      fetchData(true);
      return;
    }

    if (hasTimedOut && !subscriptionChanged) {
      clearPendingCheckout();
      toast({
        title: "Payment not completed",
        description: "No successful Stripe payment was detected. Please try again.",
        variant: "destructive",
      });
    }
  }, [company, companyId, fetchData, toast]);

  // ── Stripe helpers ──────────────────────────────────────────────────────────
  const openBillingPortal = useCallback(async () => {
    setBillingLoading(true);
    try {
      await logAction({
        action: "view",
        targetType: "billing_portal",
        targetId: companyId ?? "billing-portal",
        targetName: company?.name ?? "Billing Portal",
        companyIdOverride: companyId ?? undefined,
        details: {
          action: "open_billing_portal",
          current_status: company?.subscription_status ?? "unknown",
        },
      });

      const { data, error } = await supabase.functions.invoke("stripe-billing-portal", {
        body: { return_url: window.location.href },
      });

      // Handle Stripe not configured (503) gracefully
      if (data?.error === "stripe_not_configured") {
        setStripeUnavailable(true);
        setBillingLoading(false);
        return;
      }

      if (error || !data?.url) throw new Error(error?.message ?? "Failed to open billing portal");
      window.location.href = data.url;
    } catch (err: unknown) {
      // Check if this is a non-2xx response that contains our friendly error
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("stripe_not_configured") || msg.includes("503") || msg.includes("non-2xx")) {
        setStripeUnavailable(true);
      } else {
        toast({
          title: "Billing portal unavailable",
          description: msg || "Please try again later.",
          variant: "destructive",
        });
      }
      setBillingLoading(false);
    }
  }, [company?.name, company?.subscription_status, companyId, logAction, toast]);

  // ── Billing email helpers ────────────────────────────────────────────────────
  const openBillingEmailDialog = useCallback(() => {
    setBillingEmailInput(company?.billing_email ?? company?.email ?? "");
    setBillingEmailDialogOpen(true);
  }, [company]);

  const saveBillingEmail = useCallback(async () => {
    if (!billingEmailInput || !billingEmailInput.includes("@") || !companyId) return;
    setSavingBillingEmail(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ billing_email: billingEmailInput })
        .eq("id", companyId);
      if (error) throw error;
      setCompany((prev) => prev ? { ...prev, billing_email: billingEmailInput } : prev);
      await logAction({
        action: "update_billing_email",
        targetType: "company",
        targetId: companyId,
        targetName: company?.name ?? "Company",
        companyIdOverride: companyId,
        details: { new_email: billingEmailInput },
      });
      toast({ title: "Billing email saved", description: `Invoices will be sent to ${billingEmailInput}` });
      setBillingEmailDialogOpen(false);
    } catch (err: unknown) {
      toast({
        title: "Failed to save billing email",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingBillingEmail(false);
    }
  }, [billingEmailInput, company, companyId, logAction, toast]);

  // ── Auto-create draft invoice for active subscriptions with no invoices ──────
  const legacyAutoCreateDraftInvoice = useCallback(async (comp: CompanyBillingInfo) => {
    if (!companyId) return;
    if (comp.subscription_status !== "active" && comp.subscription_status !== "trial") return;

    const tier = comp.subscription_tier ?? "basic";
    const price = PLAN_PRICES[tier] ?? 149;
    const now = new Date();
    const periodStart = comp.subscription_start_date ? new Date(comp.subscription_start_date) : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 14);

    const invoiceNum = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-001`;

    const { error } = await supabase.from("invoices").insert({
      company_id: companyId,
      invoice_number: invoiceNum,
      status: comp.subscription_status === "active" ? "pending" : "draft",
      subtotal: price,
      tax_amount: 0,
      total: price,
      currency: "EUR",
      billing_period_start: periodStart.toISOString(),
      billing_period_end: periodEnd.toISOString(),
      due_date: dueDate.toISOString(),
      line_items: [
        {
          description: `${PLAN_LABELS[tier]} Plan – HSE Safety Hub Subscription`,
          quantity: 1,
          unit_price: price,
          total: price,
        },
      ],
      notes: "Auto-generated invoice for subscription period.",
      metadata: { auto_generated: true, plan: tier },
    });

    if (!error) {
      // Refresh invoices list
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (data) setInvoices(data as Invoice[]);
    }
  }, [companyId]);

  const openCheckout = useCallback((tier: PlanTier, interval: BillingInterval = "monthly") => {
    setBillingLoading(true);
    try {
      if (!companyId) throw new Error("No company ID found");
      
      const planLinks = STRIPE_PAYMENT_LINKS[tier as keyof typeof STRIPE_PAYMENT_LINKS];
      if (!planLinks) throw new Error(`Invalid plan tier: ${tier}`);
      
      const paymentLink = interval === "yearly" ? planLinks.yearly : planLinks.monthly;
      const urlWithRef = new URL(paymentLink);
      urlWithRef.searchParams.set("client_reference_id", companyId);

      const billingEmail = company?.billing_email ?? company?.email;
      if (billingEmail) {
        urlWithRef.searchParams.set("prefilled_email", billingEmail);
      }

      writePendingCheckout({
        companyId,
        tier,
        interval,
        startedAt: new Date().toISOString(),
        previousTier: company?.subscription_tier ?? null,
        previousStatus: company?.subscription_status ?? null,
        previousSubscriptionId: company?.stripe_subscription_id ?? null,
        previousEndDate: company?.subscription_end_date ?? null,
      });

      void logAction({
        action: "start_checkout",
        targetType: "subscription",
        targetId: `${tier}:${interval}`,
        targetName: `${PLAN_LABELS[tier]} ${interval === "yearly" ? "Yearly" : "Monthly"}`,
        companyIdOverride: companyId,
        details: {
          tier,
          interval,
          amount: PLAN_PRICES[tier] ?? null,
          payment_link: paymentLink,
        },
      });

      window.location.href = urlWithRef.toString();
    } catch (err: unknown) {
      toast({
        title: "Checkout unavailable",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
      setBillingLoading(false);
    }
  }, [company, companyId, logAction, toast]);

  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "paid");
    const pending = invoices.filter((i) => i.status === "pending" || i.status === "draft");
    const overdue = invoices.filter((i) => i.status === "overdue");
    const totalPaid = paid.reduce((s, i) => s + i.total, 0);
    const totalPending = pending.reduce((s, i) => s + i.total, 0);
    const totalOverdue = overdue.reduce((s, i) => s + i.total, 0);
    const upcomingDates = pending.map((i) => i.due_date).filter(Boolean).sort() as string[];
    const nextBilling = upcomingDates[0] ?? null;
    return { paid, pending, overdue, totalPaid, totalPending, totalOverdue, nextBilling };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (activeTab === "all") return invoices;
    if (activeTab === "paid") return invoices.filter((i) => i.status === "paid");
    if (activeTab === "pending") return invoices.filter((i) => i.status === "pending" || i.status === "draft");
    if (activeTab === "overdue") return invoices.filter((i) => i.status === "overdue");
    return invoices;
  }, [invoices, activeTab]);

  const currency = invoices[0]?.currency ?? "EUR";

  const handleView = (invoice: Invoice) => {
    void logAction({
      action: "view",
      targetType: "invoice",
      targetId: invoice.id,
      targetName: invoice.invoice_number,
      companyIdOverride: companyId ?? undefined,
      details: {
        status: invoice.status,
        total: invoice.total,
        currency: invoice.currency,
      },
    });
    setSelectedInvoice(invoice);
    setDetailOpen(true);
  };

  const handleDownload = (invoice: Invoice) => {
    void logAction({
      action: "download_invoice",
      targetType: "invoice",
      targetId: invoice.id,
      targetName: invoice.invoice_number,
      companyIdOverride: companyId ?? undefined,
      details: {
        total: invoice.total,
        currency: invoice.currency,
      },
    });
    generateInvoicePDF(invoice, company?.name ?? "Company");
    toast({ title: "PDF generated", description: `${invoice.invoice_number}.pdf downloaded.` });
  };

  const handleSendClick = (invoice: Invoice) => {
    setSendTarget(invoice);
    setSendEmail(company?.billing_email ?? company?.email ?? "");
    setSendDialogOpen(true);
  };

  const handleSendConfirm = async () => {
    if (!sendTarget || !sendEmail) return;
    setSendLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoice_id: sendTarget.id,
          recipient_email: sendEmail,
          recipient_name: company?.name ?? "Client",
        },
      });
      if (error || !data?.success) throw new Error(error?.message ?? data?.error ?? "Failed to send");
      await logAction({
        action: "send_invoice",
        targetType: "invoice",
        targetId: sendTarget.id,
        targetName: sendTarget.invoice_number,
        companyIdOverride: companyId ?? undefined,
        details: {
          recipient_email: sendEmail,
          sent_via: "supabase_function",
          status: sendTarget.status,
        },
      });
      toast({
        title: "Invoice sent!",
        description: `${sendTarget.invoice_number} emailed to ${sendEmail}.`,
      });
      setSendDialogOpen(false);
      setDetailOpen(false);
      fetchData(true); // refresh to pick up last_sent_at
    } catch (err: unknown) {
      toast({
        title: "Failed to send invoice",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendLoading(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-52 bg-muted animate-pulse rounded" />
            <div className="h-4 w-72 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-56 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error && invoices.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-950">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-lg">Failed to load billing data</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">{error}</p>
        </div>
        <Button variant="outline" onClick={() => fetchData()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // ── No company ──────────────────────────────────────────────────────────────
  if (!companyId) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
        <div className="p-4 rounded-full bg-muted">
          <Building2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-muted-foreground">No company associated with your account.</p>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Invoices &amp; Billing
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your subscription billing and download invoices
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stripe not configured banner */}
      {stripeUnavailable && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Billing Portal Not Yet Configured</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Stripe payment processing is not yet set up. To use the billing portal, an administrator must configure the <strong>STRIPE_SECRET_KEY</strong> in the Supabase Edge Function secrets. Until then, invoices can still be generated and sent manually below.
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700" onClick={() => setStripeUnavailable(false)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Missing billing email banner */}
      {!company?.billing_email && company && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Set a Billing Email</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              No billing email is set for your account. Invoices and payment receipts will be sent to this address.
            </p>
          </div>
          <Button size="sm" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white" onClick={openBillingEmailDialog}>
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Set Email
          </Button>
        </div>
      )}

      {/* Stats + Subscription card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Paid */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(stats.totalPaid, currency)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.paid.length} paid invoice{stats.paid.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            {/* Pending */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(stats.totalPending, currency)}</div>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <p className="text-xs text-muted-foreground">{stats.pending.length} pending</p>
                  {stats.totalOverdue > 0 && (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      · {fmt(stats.totalOverdue, currency)} overdue
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Next billing */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.nextBilling ? fmtDate(stats.nextBilling) : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {company?.subscription_tier
                    ? `${PLAN_LABELS[company.subscription_tier]} ${billingIntervalLabel(company.subscription_billing_interval).toLowerCase()} plan`
                    : "Monthly subscription"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Overdue alert */}
          {stats.overdue.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-red-800 dark:text-red-200">
                  {stats.overdue.length} overdue invoice{stats.overdue.length > 1 ? "s" : ""}
                </p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-0.5">
                  Total outstanding: {fmt(stats.totalOverdue, currency)}. Please settle promptly to avoid service interruption.
                </p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => setActiveTab("overdue")}>
                View
              </Button>
            </div>
          )}
        </div>

        {/* Subscription card */}
        <div className="lg:col-span-1">
          {company ? (
            <SubscriptionCard
              company={company}
              onManageBilling={openBillingPortal}
              onUpgrade={openCheckout}
              billingLoading={billingLoading}
            />
          ) : (
            <Card className="h-full flex items-center justify-center p-6">
              <p className="text-sm text-muted-foreground text-center">Subscription info unavailable</p>
            </Card>
          )}
        </div>
      </div>

      {/* Invoice tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription className="mt-0.5">View and download all your invoices</CardDescription>
              </div>
              <TabsList className="self-start sm:self-auto flex-wrap h-auto gap-1">
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 min-w-[1.4rem] text-center">
                    {invoices.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="paid">
                  Paid
                  {stats.paid.length > 0 && (
                    <span className="ml-1.5 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full px-1.5 py-0.5 min-w-[1.4rem] text-center">
                      {stats.paid.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {stats.pending.length > 0 && (
                    <span className="ml-1.5 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full px-1.5 py-0.5 min-w-[1.4rem] text-center">
                      {stats.pending.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  Overdue
                  {stats.overdue.length > 0 && (
                    <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full px-1.5 py-0.5 min-w-[1.4rem] text-center">
                      {stats.overdue.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="payment-methods">Payment</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {(["all", "paid", "pending", "overdue"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <InvoiceTable
                  invoices={tab === activeTab ? filteredInvoices : []}
                  companyName={company?.name ?? "Company"}
                  onView={handleView}
                  onDownload={handleDownload}
                  onSend={handleSendClick}
                  sendLoading={sendLoading}
                />
              </TabsContent>
            ))}
            <TabsContent value="payment-methods" className="mt-0">
              <PaymentMethodsTab
                company={company}
                onManageBilling={openBillingPortal}
                billingLoading={billingLoading}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Detail dialog */}
      <InvoiceDetailDialog
        invoice={selectedInvoice}
        companyName={company?.name ?? "Company"}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSend={handleSendClick}
        sendLoading={sendLoading}
      />

      {/* Send Invoice Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Send Invoice by Email
            </DialogTitle>
            <DialogDescription>
              {sendTarget?.invoice_number} will be sent as a formatted HTML email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="send-email">Recipient Email</Label>
              <Input
                id="send-email"
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="client@example.com"
              />
              <p className="text-xs text-muted-foreground">
                The invoice will be sent to this address. Defaults to the company's billing email.
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
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sendLoading}>
              Cancel
            </Button>
            <Button onClick={handleSendConfirm} disabled={sendLoading || !sendEmail}>
              {sendLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Email Setup Dialog */}
      <Dialog open={billingEmailDialogOpen} onOpenChange={setBillingEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Set Billing Email
            </DialogTitle>
            <DialogDescription>
              Invoices, payment receipts, and billing notifications will be sent to this address.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="billing-email-input">Billing Email Address</Label>
              <Input
                id="billing-email-input"
                type="email"
                value={billingEmailInput}
                onChange={(e) => setBillingEmailInput(e.target.value)}
                placeholder="billing@yourcompany.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingEmailDialogOpen(false)} disabled={savingBillingEmail}>
              Cancel
            </Button>
            <Button onClick={saveBillingEmail} disabled={savingBillingEmail || !billingEmailInput}>
              {savingBillingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
