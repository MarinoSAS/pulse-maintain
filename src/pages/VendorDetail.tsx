import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MapPin, DollarSign, Calendar, Receipt, Trash2 } from "lucide-react";
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
import { useNavigate, useParams } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserRole } from "@/hooks/useUserRole";

type Vendor = {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

type Expense = {
  id: string;
  date: string;
  amount: number;
  category: string;
  invoice_number: string | null;
  description: string | null;
  asset: { name: string; asset_id: string } | null;
};

export default function VendorDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (id) {
      loadVendor();
      loadExpenses();
    }
  }, [id]);

  const loadVendor = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVendor(data);
    } catch (error: any) {
      toast.error("Failed to load vendor");
      navigate("/vendors");
    }
  };

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          asset:assets(name, asset_id)
        `)
        .eq("vendor_id", id)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const deleteVendor = async () => {
    try {
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Vendor deleted successfully");
      navigate("/vendors");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete vendor");
    }
  };

  if (!vendor) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  const totalPaid = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = expenses.length > 0 ? totalPaid / expenses.length : 0;
  const firstPayment = expenses.length > 0 ? expenses[expenses.length - 1].date : null;
  const lastPayment = expenses.length > 0 ? expenses[0].date : null;

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/vendors")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vendors
          </Button>
          
          <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground">{vendor.name}</h1>
            {vendor.contact_person && (
              <p className="text-lg text-muted-foreground mt-1">Contact: {vendor.contact_person}</p>
            )}
          </div>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Vendor
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {vendor.name}. 
                    {expenses.length > 0 && ` This vendor has ${expenses.length} associated expense${expenses.length !== 1 ? 's' : ''} which will have their vendor reference removed.`}
                    {' '}This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={deleteVendor}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

          {/* Contact Information */}
          <div className="mt-6 flex flex-wrap gap-4">
            {vendor.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{vendor.email}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{vendor.address}</span>
              </div>
            )}
          </div>

          {vendor.notes && (
            <Card className="mt-6 bg-gradient-card">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                <p className="text-foreground">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-md bg-gradient-card border-accent/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-3xl font-bold mt-2">${totalPaid.toLocaleString()}</p>
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
                  <p className="text-sm font-medium text-muted-foreground"># of Expenses</p>
                  <p className="text-3xl font-bold mt-2">{expenses.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Expense</p>
                  <p className="text-3xl font-bold mt-2">${avgExpense.toFixed(0)}</p>
                </div>
                <div className="p-3 rounded-xl bg-warning/10">
                  <DollarSign className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Payment</p>
                  <p className="text-lg font-bold mt-2">
                    {lastPayment ? new Date(lastPayment).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <Calendar className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Table */}
        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">Payment History</h2>
            {loading ? (
              <div className="text-center py-8">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expenses recorded for this vendor yet.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {expense.asset 
                            ? `${expense.asset.name} (${expense.asset.asset_id})`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.invoice_number || "—"}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {expense.description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-accent">
                          ${expense.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-accent">
                    ${totalPaid.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
