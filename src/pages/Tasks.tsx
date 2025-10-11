import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Clock, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
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

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  assetId: z.string().optional(),
});

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  approval_status: string;
  is_issue_report: boolean;
  rejection_reason: string | null;
  team_member?: { name: string; initials: string } | null;
  asset?: { name: string } | null;
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { role } = useUserRole();
  const navigate = useNavigate();
  const isRegularUser = !role || (role !== 'admin' && role !== 'manager');

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
      assignedTo: "",
      dueDate: "",
      assetId: "",
    },
  });

  useEffect(() => {
    loadTasks();
    loadTeamMembers();
    loadAssets();
    if (role === 'admin' || role === 'manager') {
      loadPendingCount();
    }
  }, [role]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          team_member:team_members(name, initials),
          asset:assets(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: 'exact', head: true })
        .eq("approval_status", "pending")
        .eq("is_issue_report", true);

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error: any) {
      console.error("Failed to load pending count:", error);
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

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const taskData: any = {
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        status: "To Do",
        created_by: user?.id,
        asset_id: values.assetId || null,
      };

      // If regular user, mark as issue report pending approval
      if (isRegularUser) {
        taskData.is_issue_report = true;
        taskData.approval_status = 'pending';
      } else {
        // Admin/Manager can create approved tasks and assign them
        taskData.approval_status = 'approved';
        taskData.assigned_to = values.assignedTo || null;
        taskData.due_date = values.dueDate || null;
      }

      const { error } = await supabase.from("tasks").insert(taskData);

      if (error) throw error;

      if (isRegularUser) {
        toast.success("Issue report submitted for approval!");
      } else {
        toast.success("Task created successfully!");
      }
      
      form.reset();
      setOpen(false);
      loadTasks();
      if (role === 'admin' || role === 'manager') {
        loadPendingCount();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: "To Do" | "In Progress" | "Done") => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task updated!");
      loadTasks();
    } catch (error: any) {
      toast.error("Failed to update task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "destructive";
      case "High": return "destructive";
      case "Medium": return "default";
      default: return "secondary";
    }
  };

  const renderTaskColumn = (status: string, title: string) => {
    const columnTasks = tasks.filter((t) => t.status === status && t.approval_status === 'approved');
    
    return (
      <Card className="shadow-md bg-gradient-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <Badge variant="secondary">{columnTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {columnTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No {title.toLowerCase()} tasks</p>
            ) : (
              columnTasks.map((task) => (
                <div key={task.id} className="p-4 rounded-lg border border-border bg-background hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground">{task.title}</h4>
                    {task.is_issue_report && (
                      <Badge variant="outline" className="text-xs">Issue Report</Badge>
                    )}
                  </div>
                  {task.asset && (
                    <p className="text-xs text-muted-foreground mb-1">Asset: {task.asset.name}</p>
                  )}
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {task.team_member && (
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {task.team_member.initials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {task.due_date}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {status !== "To Do" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, "To Do")}
                        className="text-xs"
                      >
                        To Do
                      </Button>
                    )}
                    {status !== "In Progress" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, "In Progress")}
                        className="text-xs"
                      >
                        In Progress
                      </Button>
                    )}
                    {status !== "Done" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, "Done")}
                        className="text-xs"
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {(role === 'admin' || role === 'manager') && pendingCount > 0 && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                      {pendingCount} pending issue {pendingCount === 1 ? 'report' : 'reports'} awaiting approval
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Review and approve maintenance requests from team members
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('/tasks/approvals')} variant="outline">
                  Review Approvals
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              {isRegularUser ? "Report Issue" : "Task Management"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isRegularUser 
                ? "Report maintenance issues that require attention" 
                : "Assign and track maintenance tasks"}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                {isRegularUser ? "Report Issue" : "New Task"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isRegularUser ? "Report Maintenance Issue" : "Create New Task"}</DialogTitle>
                <DialogDescription>
                  {isRegularUser 
                    ? "Submit an issue report. An admin will review and assign it." 
                    : "Add a new maintenance task"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Replace brake pads" {...field} />
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
                          <Textarea placeholder="Task details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select related asset" />
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRegularUser ? "Urgency" : "Priority"}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!isRegularUser && (
                    <>
                      <FormField
                        control={form.control}
                        name="assignedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign To (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
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
                    </>
                  )}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-accent">
                      {isRegularUser ? "Submit Report" : "Create Task"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading tasks...</div>
        ) : isRegularUser ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">My Reports</h2>
            {tasks.filter(t => t.is_issue_report).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No reports submitted yet</p>
                </CardContent>
              </Card>
            ) : (
              tasks.filter(t => t.is_issue_report).map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        {task.asset && (
                          <p className="text-sm text-muted-foreground">Asset: {task.asset.name}</p>
                        )}
                      </div>
                      <Badge variant={task.approval_status === 'pending' ? 'default' : task.approval_status === 'approved' ? 'secondary' : 'destructive'}>
                        {task.approval_status === 'pending' ? 'Pending' : task.approval_status === 'approved' ? 'Approved' : 'Rejected'}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">{task.priority}</Badge>
                      {task.approval_status === 'approved' && task.team_member && (
                        <span className="text-xs text-muted-foreground">Assigned to: {task.team_member.name}</span>
                      )}
                    </div>
                    {task.rejection_reason && (
                      <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                        <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                        <p className="text-sm text-destructive/80">{task.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderTaskColumn("To Do", "To Do")}
            {renderTaskColumn("In Progress", "In Progress")}
            {renderTaskColumn("Done", "Done")}
          </div>
        )}
      </div>
    </Layout>
  );
}
