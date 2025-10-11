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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const assetFormSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required").max(50, "Asset ID too long"),
  name: z.string().min(1, "Asset name is required").max(100, "Asset name too long"),
  description: z.string().max(500, "Description too long").optional(),
  category: z.enum(["Vehicles", "Equipment", "Tools", "Facilities"], {
    required_error: "Please select a category",
  }),
  assignedTo: z.string().optional(),
  status: z.enum(["Active", "Maintenance", "Inactive"], {
    required_error: "Please select a status",
  }),
  lastService: z.string().optional(),
  odometerReading: z.string().optional(),
  maintenanceIntervalDays: z.string().optional(),
  maintenanceIntervalKm: z.string().optional(),
});

export default function NewAsset() {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      assetId: "",
      name: "",
      description: "",
      status: "Active",
      assignedTo: "",
      lastService: "",
    },
  });

  const selectedCategory = form.watch("category");

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("name");

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error: any) {
      console.error("Failed to load team members:", error);
    }
  };

  const onSubmit = async (values: z.infer<typeof assetFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("assets").insert({
        asset_id: values.assetId,
        name: values.name,
        description: values.description || null,
        category: values.category,
        status: values.status,
        assigned_to: values.assignedTo || null,
        last_service: values.lastService || null,
        odometer_reading: values.odometerReading ? parseInt(values.odometerReading) : null,
        maintenance_interval_days: values.maintenanceIntervalDays ? parseInt(values.maintenanceIntervalDays) : null,
        maintenance_interval_km: values.maintenanceIntervalKm ? parseInt(values.maintenanceIntervalKm) : null,
        created_by: user?.id,
      });

      if (error) throw error;
      
      toast.success("Asset added successfully!");
      navigate("/assets");
    } catch (error: any) {
      toast.error(error.message || "Failed to add asset");
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
              onClick={() => navigate("/assets")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assets
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Add New Asset</h1>
            <p className="text-muted-foreground mt-1">Enter the details of the new asset</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset ID</FormLabel>
                    <FormControl>
                      <Input placeholder="FL-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Forklift Toyota 7FBR" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Asset description or notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Vehicles">Vehicles</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Tools">Tools</SelectItem>
                        <SelectItem value="Facilities">Facilities</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedCategory && selectedCategory !== "Facilities" && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} - {member.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastService"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Service Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Maintenance Configuration */}
              {selectedCategory && selectedCategory !== "Facilities" && (
                <div className="pt-6 border-t space-y-6">
                  <h3 className="font-semibold text-lg">Maintenance Schedule</h3>
                  {selectedCategory === "Vehicles" && (
                    <FormField
                      control={form.control}
                      name="odometerReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Odometer (km)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="25000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="maintenanceIntervalDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Interval (days)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="180" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {selectedCategory === "Vehicles" && (
                    <FormField
                      control={form.control}
                      name="maintenanceIntervalKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Interval (km)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
              onClick={() => navigate("/assets")}
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
              {isSubmitting ? "Saving..." : "Save Asset"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
