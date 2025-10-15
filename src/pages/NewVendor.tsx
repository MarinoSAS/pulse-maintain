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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required").max(100, "Name too long"),
  vendorTypeId: z.string().uuid().optional(),
  contactPerson: z.string().max(100, "Contact person name too long").optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(20, "Phone number too long").optional(),
  address: z.string().max(500, "Address too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

export default function NewVendor() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorTypes, setVendorTypes] = useState<Array<{id: string, name: string}>>([]);
  const { isAdmin } = useUserRole();
  
  const form = useForm<z.infer<typeof vendorSchema>>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      vendorTypeId: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    loadVendorTypes();
  }, []);

  const loadVendorTypes = async () => {
    const { data, error } = await supabase
      .from("vendor_types")
      .select("id, name")
      .order("name");
    
    if (error) {
      toast.error("Failed to load vendor types");
    } else {
      setVendorTypes(data || []);
    }
  };

  const onSubmit = async (values: z.infer<typeof vendorSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Managers create pending vendors, admins create approved vendors
      const approvalStatus = isAdmin ? 'approved' : 'pending';
      
      const { error } = await supabase.from("vendors").insert({
        name: values.name,
        vendor_type_id: values.vendorTypeId || null,
        contact_person: values.contactPerson || null,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        notes: values.notes || null,
        created_by: user?.id,
        approval_status: approvalStatus,
        approved_by: isAdmin ? user?.id : null,
        approved_at: isAdmin ? new Date().toISOString() : null,
      });

      if (error) throw error;
      
      if (isAdmin) {
        toast.success("Vendor added successfully!");
      } else {
        toast.success("Vendor submitted for admin approval!");
      }
      navigate("/vendors");
    } catch (error: any) {
      toast.error(error.message || "Failed to add vendor");
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
              onClick={() => navigate("/vendors")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vendors
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Add New Vendor</h1>
            <p className="text-muted-foreground mt-1">Enter the details of the service provider</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto Parts Co." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Type (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vendor type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendorTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
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
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@autoparts.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Main Street, City, State ZIP" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional information about this vendor..." 
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
              onClick={() => navigate("/vendors")}
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
              {isSubmitting ? "Saving..." : "Save Vendor"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
