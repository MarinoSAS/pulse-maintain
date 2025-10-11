import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Plus, DollarSign, TrendingUp, Users, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Vendor = {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  totalPaid: number;
  expenseCount: number;
  lastPaymentDate: string | null;
};

export default function Vendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const { data: vendorsData, error } = await supabase
        .from("vendors")
        .select("*")
        .order("name");

      if (error) throw error;

      // Fetch expenses for each vendor
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("vendor_id, amount, date");

      if (expensesError) throw expensesError;

      // Calculate totals for each vendor
      const vendorsWithTotals = vendorsData?.map(vendor => {
        const vendorExpenses = expensesData?.filter(exp => exp.vendor_id === vendor.id) || [];
        const totalPaid = vendorExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const lastPayment = vendorExpenses.length > 0 
          ? vendorExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : null;

        return {
          ...vendor,
          totalPaid,
          expenseCount: vendorExpenses.length,
          lastPaymentDate: lastPayment,
        };
      }) || [];

      // Sort by total paid (highest first)
      vendorsWithTotals.sort((a, b) => b.totalPaid - a.totalPaid);
      
      setVendors(vendorsWithTotals);
    } catch (error: any) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const deleteVendor = async (id: string, name: string, expenseCount: number) => {
    try {
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`${name} deleted successfully`);
      loadVendors();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete vendor");
    }
  };

  const totalVendors = vendors.length;
  const totalPaidOut = vendors.reduce((sum, v) => sum + v.totalPaid, 0);
  const topVendor = vendors.length > 0 ? vendors[0] : null;
  const activeVendors = vendors.filter(v => {
    if (!v.lastPaymentDate) return false;
    const daysSincePayment = Math.floor((Date.now() - new Date(v.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSincePayment <= 90;
  }).length;

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Vendors</h1>
            <p className="text-muted-foreground mt-1">Manage service providers and track payments</p>
          </div>
          <Button 
            onClick={() => navigate("/vendors/new")}
            className="bg-gradient-accent shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-md bg-gradient-card border-accent/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Vendors</p>
                  <p className="text-3xl font-bold mt-2">{totalVendors}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/10">
                  <Users className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid Out</p>
                  <p className="text-3xl font-bold mt-2">${totalPaidOut.toLocaleString()}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Top Vendor</p>
                  <p className="text-lg font-bold mt-2 truncate">{topVendor?.name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">${topVendor?.totalPaid.toFixed(2) || "0.00"}</p>
                </div>
                <div className="p-3 rounded-xl bg-warning/10">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                  <p className="text-3xl font-bold mt-2">{activeVendors}</p>
                  <p className="text-sm text-muted-foreground">Last 90 days</p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <Store className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendors Table */}
        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">All Vendors</h2>
            {loading ? (
              <div className="text-center py-8">Loading vendors...</div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No vendors yet. Add your first vendor using the button above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-center"># Expenses</TableHead>
                    <TableHead>Last Payment</TableHead>
                    {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                 {vendors.map((vendor) => (
                  <TableRow 
                    key={vendor.id}
                    className="group hover:bg-accent/5"
                  >
                    <TableCell 
                      className="font-semibold cursor-pointer"
                      onClick={() => navigate(`/vendors/${vendor.id}`)}
                    >
                      {vendor.name}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/vendors/${vendor.id}`)} className="cursor-pointer">
                      {vendor.contact_person || "—"}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/vendors/${vendor.id}`)} className="cursor-pointer">
                      {vendor.email || "—"}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/vendors/${vendor.id}`)} className="cursor-pointer">
                      {vendor.phone || "—"}
                    </TableCell>
                    <TableCell 
                      onClick={() => navigate(`/vendors/${vendor.id}`)}
                      className="text-right font-bold text-accent cursor-pointer"
                    >
                      ${vendor.totalPaid.toFixed(2)}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/vendors/${vendor.id}`)} className="text-center cursor-pointer">
                      <Badge variant="outline">{vendor.expenseCount}</Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/vendors/${vendor.id}`)} className="cursor-pointer">
                      {vendor.lastPaymentDate 
                        ? new Date(vendor.lastPaymentDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {vendor.name}. 
                                {vendor.expenseCount > 0 && ` This vendor has ${vendor.expenseCount} associated expense${vendor.expenseCount !== 1 ? 's' : ''} which will have their vendor reference removed.`}
                                {' '}This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteVendor(vendor.id, vendor.name, vendor.expenseCount);
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
