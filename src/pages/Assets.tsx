import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Wrench, Building2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const assetCategories = [
  { name: "Vehicles", count: 12, icon: Truck, color: "bg-primary/10 text-primary" },
  { name: "Equipment", count: 18, icon: Package, color: "bg-accent/10 text-accent" },
  { name: "Tools", count: 8, icon: Wrench, color: "bg-success/10 text-success" },
  { name: "Facilities", count: 9, icon: Building2, color: "bg-warning/10 text-warning" },
];

const recentAssets = [
  { id: "FL-001", name: "Forklift Toyota 7FBR", category: "Equipment", status: "Active", lastService: "2025-09-15" },
  { id: "V-003", name: "Delivery Van Ford Transit", category: "Vehicles", status: "Active", lastService: "2025-09-20" },
  { id: "HL-005", name: "Hand Lift Crown PTH", category: "Equipment", status: "Maintenance", lastService: "2025-08-30" },
  { id: "CR-A", name: "Cold Room A", category: "Facilities", status: "Active", lastService: "2025-09-10" },
  { id: "OFF-201", name: "Office Suite 201", category: "Facilities", status: "Active", lastService: "2025-09-05" },
];

const assetFormSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required").max(50, "Asset ID too long"),
  name: z.string().min(1, "Asset name is required").max(100, "Asset name too long"),
  description: z.string().max(500, "Description too long").optional(),
  category: z.enum(["Vehicles", "Equipment", "Tools", "Facilities"], {
    required_error: "Please select a category",
  }),
  assignedTo: z.string().max(100, "Name too long").optional(),
  status: z.enum(["Active", "Maintenance", "Inactive"], {
    required_error: "Please select a status",
  }),
  lastService: z.string().optional(),
});

export default function Assets() {
  const [open, setOpen] = useState(false);
  
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

  const onSubmit = (values: z.infer<typeof assetFormSchema>) => {
    console.log(values);
    toast.success("Asset added successfully!");
    form.reset();
    setOpen(false);
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Asset Registry</h1>
            <p className="text-muted-foreground mt-1">Manage your fleet and equipment</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>
                  Enter the details of the new asset. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <FormControl>
                            <Input placeholder="Team member name" {...field} />
                          </FormControl>
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
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-accent">
                      Add Asset
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assetCategories.map((category) => (
            <Card key={category.name} className="shadow-md bg-gradient-card hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{category.name}</p>
                    <p className="text-3xl font-bold mt-2">{category.count}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${category.color}`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Assets List */}
        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">All Assets</h2>
            <div className="space-y-3">
              {recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{asset.name}</h4>
                      <p className="text-sm text-muted-foreground">ID: {asset.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-muted-foreground">Last Service</p>
                      <p className="text-sm font-medium">{asset.lastService}</p>
                    </div>
                    <Badge variant={asset.status === "Active" ? "default" : "secondary"}>
                      {asset.status}
                    </Badge>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
