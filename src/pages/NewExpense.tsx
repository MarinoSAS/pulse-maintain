import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  maintenanceCategory: z.string().optional(),
  odometerAtService: z.string().optional(),
  nextServiceIntervalDays: z.string().optional(),
  nextServiceIntervalKm: z.string().optional(),
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
      maintenanceCategory: "",
      odometerAtService: "",
      nextServiceIntervalDays: "",
      nextServiceIntervalKm: "",
    },
  });

  const serviceType = form.watch("serviceType");
  const isMaintenanceService = ["Service", "Oil Change", "MOT", "Tachograph", "Speed Limiter", "Repair"].includes(serviceType);

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
      
      const expenseData: any = {
        asset_id: values.assetId,
        category: values.serviceType,
        amount: parseFloat(values.cost),
        date: values.date,
        invoice_number: values.invoiceNumber || null,
        vendor_id: values.vendorId || null,
        description: values.description || null,
        created_by: user?.id,
      };

      // Add maintenance metadata if provided
      if (values.maintenanceCategory) {
        expenseData.maintenance_category = values.maintenanceCategory;
      }
      if (values.odometerAtService) {
        expenseData.odometer_at_service = parseInt(values.odometerAtService);
      }
      if (values.nextServiceIntervalDays) {
        expenseData.next_service_interval_days = parseInt(values.nextServiceIntervalDays);
      }
      if (values.nextServiceIntervalKm) {
        expenseData.next_service_interval_km = parseInt(values.nextServiceIntervalKm);
      }

      const { data: expense, error } = await supabase.from("expenses").insert(expenseData).select().single();

      if (error) throw error;

      // Call edge function to auto-schedule maintenance if metadata provided
      if (values.maintenanceCategory && (values.nextServiceIntervalDays || values.nextServiceIntervalKm)) {
        await supabase.functions.invoke('auto-schedule-maintenance', {
          body: { expenseId: expense.id }
        });
      }
      
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
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Oil Change">Oil Change</SelectItem>
                        <SelectItem value="MOT">MOT</SelectItem>
                        <SelectItem value="Tachograph">Tachograph</SelectItem>
                        <SelectItem value="Speed Limiter">Speed Limiter</SelectItem>
                        <SelectItem value="Repair">Repair</SelectItem>
                        <SelectItem value="Brake Service">Brake Service</SelectItem>
                        <SelectItem value="Tire Replacement">Tire Replacement</SelectItem>
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

              {isMaintenanceService && (
                <div className="space-y-6 p-6 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">Automatic Maintenance Scheduling</h3>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set service intervals to automatically schedule the next maintenance. Service will be due when either time OR kilometer interval is reached (whichever comes first).
                  </p>

                  <FormField
                    control={form.control}
                    name="maintenanceCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maintenance Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Service">Service</SelectItem>
                            <SelectItem value="Oil Change">Oil Change</SelectItem>
                            <SelectItem value="MOT">MOT</SelectItem>
                            <SelectItem value="Tachograph">Tachograph</SelectItem>
                            <SelectItem value="Speed Limiter">Speed Limiter</SelectItem>
                            <SelectItem value="Repair">Repair</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="odometerAtService"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odometer at Service (km)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nextServiceIntervalDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Service Interval (Days)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 365 for 1 year" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">365 days = 1 year</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nextServiceIntervalKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Service Interval (km)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 100000" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">100,000 km</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
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
