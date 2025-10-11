import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const expenseSchema = z.object({
  assetId: z.string().min(1, "Please select an asset"),
  serviceType: z.string().min(1, "Please select a service type"),
  cost: z.string()
    .min(1, "Cost is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Cost must be a positive number"
    }),
  date: z.string().min(1, "Date is required"),
  invoiceNumber: z.string()
    .regex(/^\d*$/, "Invoice number must contain only numbers")
    .optional()
    .or(z.literal("")),
  vendorId: z.string().optional(),
  description: z.string().max(500, "Description too long").optional(),
});

export default function NewExpense() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      assetId: "",
      serviceType: "",
      cost: "",
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: "",
      vendorId: "",
      description: "",
    },
  });

  useEffect(() => {
    loadAssets();
    loadVendors();
  }, []);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("name");

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error("Failed to load assets:", error);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      console.error("Failed to load vendors:", error);
    }
  };

  const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("expenses").insert({
        asset_id: values.assetId,
        category: values.serviceType,
        amount: parseFloat(values.cost),
        date: values.date,
        invoice_number: values.invoiceNumber || null,
        vendor_id: values.vendorId || null,
        description: values.description || null,
        created_by: user?.id,
      });

      if (error) throw error;
      
      toast.success("Expense recorded successfully!");
      navigate("/expenses");
    } catch (error: any) {
      toast.error(error.message || "Failed to record expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pb-24">
        <div className="p-8 max-w-3xl mx-auto">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/expenses")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Expenses
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Record New Expense</h1>
            <p className="text-muted-foreground mt-1">Enter the details of the maintenance expense</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name} ({asset.asset_id})
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
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Oil Change">Oil Change</SelectItem>
                        <SelectItem value="Brake Service">Brake Service</SelectItem>
                        <SelectItem value="Tire Replacement">Tire Replacement</SelectItem>
                        <SelectItem value="Engine Repair">Engine Repair</SelectItem>
                        <SelectItem value="Routine Maintenance">Routine Maintenance</SelectItem>
                        <SelectItem value="Parts Replacement">Parts Replacement</SelectItem>
                        <SelectItem value="Inspection">Inspection</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="450.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this service..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg">
          <div className="max-w-3xl mx-auto flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/expenses")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-accent"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
