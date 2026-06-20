import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Props {
  onNavigateToTab?: (tab: string) => void;
}

export function InvoicesBillingTab({ onNavigateToTab }: Props) {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (companyId) {
      fetchRecentInvoices();
    }
  }, [companyId]);

  const fetchRecentInvoices = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number, created_at, total, status, currency")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) { console.error("Error fetching recent invoices:", error); return; }
      setRecentInvoices(data || []);
    } catch (err) {
      console.error("Error fetching recent invoices:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoices &amp; Billing
            </CardTitle>
            <CardDescription>View your recent invoices and billing information</CardDescription>
          </div>
          <Button onClick={() => navigate("/invoices")} variant="outline">
            <Receipt className="w-4 h-4 mr-2" />
            View All Invoices
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentInvoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice: any) => (
                    <TableRow key={invoice.invoice_number}>
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {invoice.currency === "USD" ? "$" : invoice.currency === "EUR" ? "€" : ""}
                        {invoice.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-6 border rounded-lg bg-muted/30 text-center">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No recent invoices available.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
