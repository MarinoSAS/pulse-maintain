import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Plus, CheckCircle2, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUserRole } from "@/hooks/useUserRole";

const maintenanceSchema = z.object({
  assetId: z.string().min(1, "Please select an asset"),
  maintenanceType: z.string().min(1, "Maintenance type is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type MaintenanceSchedule = {
  id: string;
  maintenance_type: string;
  scheduled_date: string;
  completed: boolean;
  completed_date: string | null;
  notes: string | null;
  asset: { asset_id: string; name: string } | null;
};

export default function Maintenance() {
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();

  const form = useForm<z.infer<typeof maintenanceSchema>>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      assetId: "",
      maintenanceType: "",
      scheduledDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    loadSchedules();
    loadAssets();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select(`
          *,
          asset:assets(asset_id, name)
        `)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      toast.error("Failed to load maintenance schedules");
    } finally {
      setLoading(false);
    }
  };

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

  const onSubmit = async (values: z.infer<typeof maintenanceSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("maintenance_schedules").insert({
        asset_id: values.assetId,
        maintenance_type: values.maintenanceType,
        scheduled_date: values.scheduledDate,
        notes: values.notes || null,
        completed: false,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Maintenance scheduled successfully!");
      form.reset();
      setOpen(false);
      loadSchedules();
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule maintenance");
    }
  };

  const markComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("maintenance_schedules")
        .update({
          completed: true,
          completed_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Maintenance marked as complete!");
      loadSchedules();
    } catch (error: any) {
      toast.error("Failed to update maintenance");
    }
  };

  const deleteSchedule = async (id: string, type: string) => {
    try {
      const { error } = await supabase
        .from("maintenance_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Maintenance schedule deleted");
      loadSchedules();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete schedule");
    }
  };

  const getStatusColor = (schedule: MaintenanceSchedule) => {
    if (schedule.completed) return "bg-success/10 text-success border-success/20";
    
    const today = new Date();
    const scheduledDate = new Date(schedule.scheduled_date);
    const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return "bg-destructive/10 text-destructive border-destructive/20";
    if (daysUntil <= 7) return "bg-warning/10 text-warning border-warning/20";
    return "bg-primary/10 text-primary border-primary/20";
  };

  const urgentCount = schedules.filter(s => {
    if (s.completed) return false;
    const today = new Date();
    const scheduledDate = new Date(s.scheduled_date);
    const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7;
  }).length;

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">Maintenance Schedule</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Track and plan maintenance activities</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-accent shadow-md hover:shadow-lg w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Maintenance</DialogTitle>
                <DialogDescription>Plan a new maintenance activity</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset" />
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
                    name="maintenanceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maintenance Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Oil Change, Annual Service, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheduled Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                          <Textarea placeholder="Additional notes..." {...field} />
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
                      Schedule
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {urgentCount > 0 && (
          <Card className="border-warning/30 bg-warning/5 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Upcoming Maintenance</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have {urgentCount} maintenance task{urgentCount !== 1 ? 's' : ''} due within the next 7 days.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Scheduled Maintenance</h2>
            </div>
            {loading ? (
              <div className="text-center py-8">Loading schedules...</div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No maintenance scheduled yet. Schedule your first maintenance above.
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(schedule)} hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{schedule.maintenance_type}</h4>
                          {schedule.completed && (
                            <Badge variant="outline" className="bg-success/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        {schedule.asset && (
                          <p className="text-sm text-muted-foreground">
                            {schedule.asset.name} ({schedule.asset.asset_id})
                          </p>
                        )}
                        {schedule.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{schedule.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium mb-2">
                          {schedule.completed ? "Completed" : "Scheduled"}: {schedule.completed ? schedule.completed_date : schedule.scheduled_date}
                        </div>
                        <div className="flex gap-2 justify-end">
                          {!schedule.completed && (
                            <Button
                              size="sm"
                              onClick={() => markComplete(schedule.id)}
                              className="bg-gradient-accent"
                            >
                              Mark Complete
                            </Button>
                          )}
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Maintenance Schedule?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this {schedule.maintenance_type} maintenance schedule. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteSchedule(schedule.id, schedule.maintenance_type)}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
