import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, TrendingUp, Trash2, FileText, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  invoice_number: string | null;
  vendor: string | null;
  company?: 'Unifruit' | 'Limnia' | 'HRC' | 'Other';
  asset: { asset_id: string; name: string } | null;
  invoice_file_path: string | null;
};

export default function Expenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          asset:assets(asset_id, name)
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string, description: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Expense deleted successfully");
      loadExpenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete expense");
    }
  };

  const viewInvoice = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      
      if (data?.signedUrl) {
        setInvoiceUrl(data.signedUrl);
        setSelectedInvoice(filePath);
      }
    } catch (error: any) {
      toast.error("Failed to load invoice");
    }
  };


  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const repairExpenses = expenses.filter(e => e.category === "Repair").reduce((sum, e) => sum + e.amount, 0);

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">Expense Tracking</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Monitor maintenance costs and invoices</p>
          </div>
          <Button 
            onClick={() => navigate("/expenses/new")}
            className="bg-gradient-accent shadow-md hover:shadow-lg w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-md bg-gradient-card border-accent/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-3xl font-bold mt-2">€{totalExpenses.toLocaleString()}</p>
                  <p className="text-sm mt-2 font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-accent/10">
                  <DollarSign className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Cost</p>
                  <p className="text-3xl font-bold mt-2">€{avgExpense.toFixed(0)}</p>
                  <p className="text-sm mt-2 font-medium text-muted-foreground">Per expense</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Repair Costs</p>
                  <p className="text-3xl font-bold mt-2">€{repairExpenses.toLocaleString()}</p>
                  <p className="text-sm mt-2 font-medium text-muted-foreground">This month</p>
                </div>
                <div className="p-3 rounded-xl bg-warning/10">
                  <DollarSign className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-xl font-bold mb-6">All Expenses</h2>
            {loading ? (
              <div className="text-center py-8">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expenses recorded yet. Add your first expense using the button above.
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors group gap-4 cursor-pointer"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{expense.description}</h4>
                    <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                    {expense.company && (
                      <Badge variant="secondary" className="text-xs">
                        {expense.company}
                      </Badge>
                    )}
                  </div>
                      {expense.asset && (
                        <p className="text-sm text-muted-foreground">
                          {expense.asset.name} ({expense.asset.asset_id})
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-sm text-muted-foreground">
                        {expense.invoice_number && <span className="text-xs md:text-sm">Invoice: {expense.invoice_number}</span>}
                        {expense.vendor && <span className="text-xs md:text-sm">Vendor: {expense.vendor}</span>}
                        <span className="text-xs md:text-sm">{expense.date}</span>
                        {expense.invoice_file_path && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs md:text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewInvoice(expense.invoice_file_path!);
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="text-left md:text-right">
                        <p className="text-xl md:text-2xl font-bold text-accent">€{expense.amount.toFixed(2)}</p>
                      </div>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this expense record. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteExpense(expense.id, expense.description)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Details Dialog */}
        <Dialog open={selectedExpense !== null} onOpenChange={() => setSelectedExpense(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
            </DialogHeader>
            {selectedExpense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-semibold">{selectedExpense.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-xl text-accent">€{selectedExpense.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="outline">{selectedExpense.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{selectedExpense.date}</p>
                  </div>
                  {selectedExpense.company && (
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <Badge variant="secondary">{selectedExpense.company}</Badge>
                    </div>
                  )}
                  {selectedExpense.invoice_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="font-semibold">{selectedExpense.invoice_number}</p>
                    </div>
                  )}
                  {selectedExpense.vendor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="font-semibold">{selectedExpense.vendor}</p>
                    </div>
                  )}
                  {selectedExpense.asset && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Asset</p>
                      <p className="font-semibold">
                        {selectedExpense.asset.name} ({selectedExpense.asset.asset_id})
                      </p>
                    </div>
                  )}
                </div>
                {selectedExpense.invoice_file_path && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      viewInvoice(selectedExpense.invoice_file_path!);
                      setSelectedExpense(null);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Invoice Document
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Viewer Dialog */}
        <Dialog open={selectedInvoice !== null} onOpenChange={() => {
          setSelectedInvoice(null);
          setInvoiceUrl(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Invoice Document</DialogTitle>
            </DialogHeader>
            {invoiceUrl && (
              <div className="space-y-4">
                {selectedInvoice?.endsWith('.pdf') ? (
                  <div className="space-y-4">
                    <iframe
                      src={invoiceUrl}
                      className="w-full h-[70vh] border border-border rounded-lg"
                      title="Invoice PDF"
                    />
                    <Button
                      onClick={() => window.open(invoiceUrl, '_blank')}
                      className="w-full"
                      variant="outline"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                ) : (
                  <img
                    src={invoiceUrl}
                    alt="Invoice"
                    className="w-full h-auto rounded-lg"
                  />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
