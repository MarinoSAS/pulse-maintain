import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const COMMON_MAINTENANCE_TYPES = {
  Vehicles: ["Service", "Oil Change", "Inspection", "Tachograph Calibration", "MOT", "Brake Service", "Tire Rotation"],
  Equipment: ["Service", "Oil Change", "Inspection", "Parts Replacement"],
  Tools: ["Inspection", "Calibration", "Service"],
  Facilities: ["Inspection", "Maintenance"],
};

const taskSchema = z.object({
  company: z.string().optional(),
  assetId: z.string().min(1, "Asset is required"),
  maintenanceType: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  assignedTeamMembers: z.array(z.string()).optional(),
  assignedVendors: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  approximateCost: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
}).refine(
  (data) => (data.assignedTeamMembers?.length || 0) > 0 || (data.assignedVendors?.length || 0) > 0,
  {
    message: "At least one team member or vendor must be assigned",
    path: ["assignedTeamMembers"],
  }
);

interface TaskFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  isRegularUser: boolean;
}

export function TaskForm({ onSuccess, onCancel, isRegularUser }: TaskFormProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<string[]>([]);
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      company: "",
      assetId: "",
      maintenanceType: "",
      title: "",
      description: "",
      assignedTeamMembers: [],
      assignedVendors: [],
      dueDate: "",
      approximateCost: "",
      priority: "Medium",
    },
  });

  useEffect(() => {
    loadAssets();
    loadTeamMembers();
    loadVendors();
  }, []);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("approval_status", "approved")
        .order("name");

      if (error) throw error;
      setAssets(data || []);
      setFilteredAssets(data || []);
    } catch (error: any) {
      console.error("Failed to load assets:", error);
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

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("approval_status", "approved")
        .order("name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      console.error("Failed to load vendors:", error);
    }
  };

  const handleCompanyChange = (company: string) => {
    form.setValue("company", company);
    form.setValue("assetId", "");
    form.setValue("maintenanceType", "");
    setMaintenanceTypes([]);

    if (company) {
      setFilteredAssets(assets.filter(a => a.company === company));
    } else {
      setFilteredAssets(assets);
    }
  };

  const handleAssetChange = (assetId: string) => {
    form.setValue("assetId", assetId);
    const selectedAsset = assets.find(a => a.id === assetId);
    
    if (selectedAsset?.category) {
      const types = COMMON_MAINTENANCE_TYPES[selectedAsset.category as keyof typeof COMMON_MAINTENANCE_TYPES] || [];
      setMaintenanceTypes(types);
    } else {
      setMaintenanceTypes([]);
    }
    
    form.setValue("maintenanceType", "");
  };

  const toggleTeamMember = (memberId: string) => {
    const current = form.getValues("assignedTeamMembers") || [];
    if (current.includes(memberId)) {
      form.setValue("assignedTeamMembers", current.filter(id => id !== memberId));
    } else {
      form.setValue("assignedTeamMembers", [...current, memberId]);
    }
  };

  const toggleVendor = (vendorId: string) => {
    const current = form.getValues("assignedVendors") || [];
    if (current.includes(vendorId)) {
      form.setValue("assignedVendors", current.filter(id => id !== vendorId));
    } else {
      form.setValue("assignedVendors", [...current, vendorId]);
    }
  };

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const taskData: any = {
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        status: "To Do",
        created_by: user?.id,
        asset_id: values.assetId,
        company: values.company || null,
        maintenance_type: values.maintenanceType || null,
        approximate_cost: values.approximateCost ? parseFloat(values.approximateCost) : null,
        assigned_team_members: values.assignedTeamMembers && values.assignedTeamMembers.length > 0 
          ? values.assignedTeamMembers 
          : null,
        assigned_vendors: values.assignedVendors && values.assignedVendors.length > 0 
          ? values.assignedVendors 
          : null,
        due_date: values.dueDate || null,
      };

      if (isRegularUser) {
        taskData.is_issue_report = true;
        taskData.approval_status = 'pending';
      } else {
        taskData.approval_status = 'approved';
      }

      const { error } = await supabase.from("tasks").insert(taskData);

      if (error) throw error;

      if (isRegularUser) {
        toast.success("Issue report submitted for approval!");
      } else {
        toast.success("Task created successfully!");
      }
      
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const selectedAsset = assets.find(a => a.id === form.watch("assetId"));
  const selectedTeamMembers = teamMembers.filter(tm => 
    form.watch("assignedTeamMembers")?.includes(tm.id)
  );
  const selectedVendors = vendors.filter(v => 
    form.watch("assignedVendors")?.includes(v.id)
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isRegularUser && (
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company (Optional)</FormLabel>
                <Select onValueChange={handleCompanyChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">All companies</SelectItem>
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
        )}

        <FormField
          control={form.control}
          name="assetId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Asset *</FormLabel>
              <Popover open={assetSearchOpen} onOpenChange={setAssetSearchOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="justify-between"
                    >
                      {selectedAsset ? `${selectedAsset.name} (${selectedAsset.asset_id})` : "Select asset..."}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search assets..." />
                    <CommandEmpty>No asset found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {filteredAssets.map((asset) => (
                        <CommandItem
                          key={asset.id}
                          value={`${asset.name} ${asset.asset_id}`}
                          onSelect={() => {
                            handleAssetChange(asset.id);
                            setAssetSearchOpen(false);
                          }}
                        >
                          {asset.name} ({asset.asset_id})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {maintenanceTypes.length > 0 && (
          <FormField
            control={form.control}
            name="maintenanceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Type (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {maintenanceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title *</FormLabel>
              <FormControl>
                <Input placeholder="Replace brake pads" {...field} maxLength={200} />
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
                <Textarea placeholder="Task details..." {...field} maxLength={1000} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isRegularUser && (
          <>
            <div className="space-y-3">
              <Label>Assign To *</Label>
              
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Team Members ({selectedTeamMembers.length})</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`team-${member.id}`}
                          checked={form.watch("assignedTeamMembers")?.includes(member.id)}
                          onCheckedChange={() => toggleTeamMember(member.id)}
                        />
                        <label
                          htmlFor={`team-${member.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {member.name} - {member.role}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Vendors ({selectedVendors.length})</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {vendors.map((vendor) => (
                      <div key={vendor.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vendor-${vendor.id}`}
                          checked={form.watch("assignedVendors")?.includes(vendor.id)}
                          onCheckedChange={() => toggleVendor(vendor.id)}
                        />
                        <label
                          htmlFor={`vendor-${vendor.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {vendor.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {(selectedTeamMembers.length > 0 || selectedVendors.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {selectedTeamMembers.map((member) => (
                    <Badge key={member.id} variant="secondary" className="gap-1">
                      {member.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleTeamMember(member.id)}
                      />
                    </Badge>
                  ))}
                  {selectedVendors.map((vendor) => (
                    <Badge key={vendor.id} variant="outline" className="gap-1">
                      {vendor.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleVendor(vendor.id)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <FormMessage>{form.formState.errors.assignedTeamMembers?.message}</FormMessage>
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approximateCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Approximate Cost (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="0.00" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isRegularUser ? "Urgency" : "Priority"}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-accent">
            {isRegularUser ? "Submit Report" : "Create Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
