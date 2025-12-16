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
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { MaintenanceRequirements, MaintenanceRequirement } from "@/components/MaintenanceRequirements";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const assetFormSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required").max(50, "Asset ID too long"),
  name: z.string().min(1, "Asset name is required").max(100, "Asset name too long"),
  description: z.string().max(500, "Description too long").optional(),
  category: z.string().min(1, "Please select a category"),
  company: z.enum(["Unifruit", "Limnia", "HRC", "Other"], {
    required_error: "Please select a company",
  }),
  assignedTo: z.string().optional(),
  status: z.enum(["Active", "Maintenance", "Inactive"], {
    required_error: "Please select a status",
  }),
  lastService: z.string().optional(),
  odometerReading: z.string().optional(),
});

export default function NewAsset() {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requirements, setRequirements] = useState<MaintenanceRequirement[]>([]);
  const { isAdmin } = useUserRole();
  
  // Template detection state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateAsset, setTemplateAsset] = useState<{ name: string; asset_id: string } | null>(null);
  const [templateRequirements, setTemplateRequirements] = useState<MaintenanceRequirement[]>([]);
  const checkedCategories = useRef<Set<string>>(new Set());
  
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

  // Generate next sequential Asset ID
  const generateNextAssetId = async () => {
    try {
      const { data: assets, error } = await supabase
        .from("assets")
        .select("asset_id");

      if (error) throw error;

      if (!assets || assets.length === 0) {
        return "0001";
      }

      // Extract numbers from existing IDs
      const numbers = assets
        .map(a => {
          const match = a.asset_id.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));

      const maxNumber = Math.max(...numbers, 0);
      const nextNumber = maxNumber + 1;

      return nextNumber.toString().padStart(4, "0");
    } catch (error) {
      console.error("Failed to generate asset ID:", error);
      return "0001";
    }
  };

  useEffect(() => {
    loadCategories();
    loadTeamMembers();
    
    // Auto-generate Asset ID on mount
    const loadNextAssetId = async () => {
      const nextId = await generateNextAssetId();
      form.setValue("assetId", nextId);
    };
    loadNextAssetId();
  }, []);

  // Check for existing requirements when category changes
  useEffect(() => {
    if (!selectedCategory || checkedCategories.current.has(selectedCategory)) return;
    
    const checkForTemplates = async () => {
      try {
        // Find assets of this category that have maintenance requirements
        const { data: assetsWithReqs, error } = await supabase
          .from("assets")
          .select(`
            id, name, asset_id,
            maintenance_requirements (
              maintenance_type,
              interval_days,
              interval_km
            )
          `)
          .eq("category", selectedCategory)
          .eq("approval_status", "approved");

        if (error) throw error;

        // Find asset with the most requirements
        const assetWithMostReqs = assetsWithReqs
          ?.filter(a => a.maintenance_requirements && a.maintenance_requirements.length > 0)
          .sort((a, b) => b.maintenance_requirements.length - a.maintenance_requirements.length)[0];

        if (assetWithMostReqs && assetWithMostReqs.maintenance_requirements.length > 0) {
          setTemplateAsset({ name: assetWithMostReqs.name, asset_id: assetWithMostReqs.asset_id });
          setTemplateRequirements(
            assetWithMostReqs.maintenance_requirements.map(r => ({
              maintenance_type: r.maintenance_type,
              interval_days: r.interval_days,
              interval_km: r.interval_km,
            }))
          );
          setShowTemplateDialog(true);
        }

        checkedCategories.current.add(selectedCategory);
      } catch (error) {
        console.error("Failed to check for templates:", error);
      }
    };

    checkForTemplates();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("asset_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Failed to load categories:", error);
    }
  };

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
      
      // Validate requirements
      const validRequirements = requirements.filter(
        r => r.maintenance_type && (r.interval_days || r.interval_km)
      );

      // Managers create pending assets, admins create approved assets
      const approvalStatus = isAdmin ? 'approved' : 'pending';
      
      const { data: asset, error: assetError } = await supabase.from("assets").insert({
        asset_id: values.assetId,
        name: values.name,
        description: values.description || null,
        category: values.category,
        company: values.company,
        status: values.status,
        assigned_to: values.assignedTo || null,
        last_service: values.lastService || null,
        odometer_reading: values.odometerReading ? parseInt(values.odometerReading) : null,
        created_by: user?.id,
        approval_status: approvalStatus,
        approved_by: isAdmin ? user?.id : null,
        approved_at: isAdmin ? new Date().toISOString() : null,
      }).select().single();

      if (assetError) {
        if (assetError.code === '23505' && assetError.message.includes('assets_asset_id_key')) {
          toast.error(`Asset ID "${values.assetId}" already exists. Please use a different ID.`);
          return;
        }
        throw assetError;
      }

      // Insert maintenance requirements
      if (validRequirements.length > 0 && asset) {
        const requirementsToInsert = validRequirements.map(req => ({
          asset_id: asset.id,
          maintenance_type: req.maintenance_type,
          interval_days: req.interval_days || null,
          interval_km: req.interval_km || null,
        }));

        const { error: reqError } = await supabase
          .from("maintenance_requirements")
          .insert(requirementsToInsert);

        if (reqError) {
          console.error("Failed to add maintenance requirements:", reqError);
          toast.error("Asset created but failed to add maintenance requirements");
        }
      }
      
      if (isAdmin) {
        toast.success("Asset added successfully!");
      } else {
        toast.success("Asset submitted for admin approval!");
      }
      navigate("/assets");
    } catch (error: any) {
      toast.error(error.message || "Failed to add asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = () => {
    setRequirements(templateRequirements);
    setShowTemplateDialog(false);
    toast.success(`Applied ${templateRequirements.length} maintenance requirements from ${templateAsset?.name}`);
  };

  return (
    <Layout>
      {/* Template Detection Dialog */}
      <AlertDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Apply Maintenance Template?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{templateAsset?.name}</strong> ({templateAsset?.asset_id}) has maintenance requirements configured for this category.
                </p>
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-foreground mb-2">
                    {templateRequirements.length} requirements:
                  </p>
                  {templateRequirements.map((req, i) => (
                    <div key={i} className="text-sm text-muted-foreground flex justify-between">
                      <span>{req.maintenance_type}</span>
                      <span className="text-xs">
                        {req.interval_days && `${req.interval_days} days`}
                        {req.interval_days && req.interval_km && " / "}
                        {req.interval_km && `${req.interval_km.toLocaleString()} km`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm">Would you like to apply these requirements to this new asset?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={applyTemplate}>Apply Requirements</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen pb-24">
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
          <div className="mb-6 md:mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/assets")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assets
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Add New Asset</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Enter the details of the new asset</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Asset ID
                      <span className="text-xs text-muted-foreground font-normal">(auto-generated)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="0001" {...field} />
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
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
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
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Unifruit">Unifruit</SelectItem>
                        <SelectItem value="Limnia">Limnia</SelectItem>
                        <SelectItem value="HRC">HRC</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
              
              {/* Current Odometer for Vehicles */}
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

              {/* Maintenance Requirements */}
              {selectedCategory && selectedCategory !== "Facilities" && (
                <div className="pt-6 border-t">
                  <MaintenanceRequirements
                    category={selectedCategory}
                    value={requirements}
                    onChange={setRequirements}
                  />
                </div>
              )}
            </form>
          </Form>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-30">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/assets")}
              disabled={isSubmitting}
              className="w-full md:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-accent w-full md:w-auto"
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
