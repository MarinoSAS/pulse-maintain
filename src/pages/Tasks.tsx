import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, AlertCircle, Trash2 } from "lucide-react";
import { TaskForm } from "@/components/TaskForm";
import { Textarea } from "@/components/ui/textarea";
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
  created_by: string | null;
  completion_status: 'pending_confirmation' | 'confirmed' | null;
  completion_confirmed_by: string | null;
  completion_confirmed_at: string | null;
  completion_comments: string | null;
  team_member?: { name: string; initials: string } | null;
  asset?: { name: string } | null;
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedTaskForConfirm, setSelectedTaskForConfirm] = useState<Task | null>(null);
  const [confirmComments, setConfirmComments] = useState("");
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const isRegularUser = role !== 'admin' && role !== 'manager';

  useEffect(() => {
    loadTasks();
    if (role === 'admin' || role === 'manager') {
      loadPendingCount();
    }
    
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadCurrentUser();
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

  const handleTaskFormSuccess = () => {
    setOpen(false);
    loadTasks();
    if (role === 'admin' || role === 'manager') {
      loadPendingCount();
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: "To Do" | "In Progress" | "Done") => {
    try {
      const updateData: any = { status: newStatus };
      
      // When a manager completes a task, set it to pending confirmation
      if (newStatus === "Done" && role === 'manager') {
        updateData.completion_status = 'pending_confirmation';
      } else if (newStatus === "Done" && role === 'admin') {
        // Admin completions are auto-confirmed
        updateData.completion_status = 'confirmed';
        updateData.completion_confirmed_by = currentUserId;
        updateData.completion_confirmed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;
      
      if (newStatus === "Done" && role === 'manager') {
        toast.success("Task marked as done - awaiting admin confirmation");
      } else {
        toast.success("Task updated!");
      }
      loadTasks();
    } catch (error: any) {
      toast.error("Failed to update task");
    }
  };

  const confirmTaskCompletion = async () => {
    if (!selectedTaskForConfirm) return;
    
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          completion_status: 'confirmed',
          completion_confirmed_by: currentUserId,
          completion_confirmed_at: new Date().toISOString(),
          completion_comments: confirmComments || null
        })
        .eq("id", selectedTaskForConfirm.id);

      if (error) throw error;
      toast.success("Task completion confirmed!");
      setConfirmDialogOpen(false);
      setSelectedTaskForConfirm(null);
      setConfirmComments("");
      loadTasks();
    } catch (error: any) {
      toast.error("Failed to confirm task completion");
    }
  };

  const deleteTask = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Task deleted successfully");
      loadTasks();
      if (role === 'admin' || role === 'manager') {
        loadPendingCount();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent": return "destructive";
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
                  
                  {/* Completion Status Badges */}
                  {task.completion_status === 'pending_confirmation' && (
                    <Badge variant="outline" className="mb-2 border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20">
                      <Clock className="w-3 h-3 mr-1" />
                      Awaiting Confirmation
                    </Badge>
                  )}
                  {task.completion_status === 'confirmed' && (
                    <div className="mb-2 space-y-1">
                      <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20">
                        ✓ Confirmed
                      </Badge>
                      {task.completion_comments && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Admin note: {task.completion_comments}
                        </p>
                      )}
                    </div>
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
                  <div className="mt-3 flex gap-2 flex-wrap">
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
                    {/* Admin Confirmation Button */}
                    {role === 'admin' && task.completion_status === 'pending_confirmation' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedTaskForConfirm(task);
                          setConfirmDialogOpen(true);
                        }}
                        className="text-xs bg-green-600 hover:bg-green-700"
                      >
                        Confirm Completion
                      </Button>
                    )}
                    
                    {role === 'admin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{task.title}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteTask(task.id, task.title)}
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {roleLoading ? (
            <div className="flex-1">
              <Skeleton className="h-8 md:h-10 w-48 md:w-56 mb-2" />
              <Skeleton className="h-4 md:h-5 w-64 md:w-72" />
            </div>
          ) : (
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">
                {isRegularUser ? "Report Issue" : "Task Management"}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                {isRegularUser 
                  ? "Report maintenance issues that require attention" 
                  : "Assign and track maintenance tasks"}
              </p>
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              {roleLoading ? (
                <Skeleton className="h-10 w-full md:w-36" />
              ) : (
                <Button className="bg-gradient-accent shadow-md hover:shadow-lg w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  {isRegularUser ? "Report Issue" : "New Task"}
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isRegularUser ? "Report Maintenance Issue" : "Create New Task"}</DialogTitle>
                <DialogDescription>
                  {isRegularUser 
                    ? "Submit an issue report. An admin will review and assign it." 
                    : "Add a new maintenance task"}
                </DialogDescription>
              </DialogHeader>
              <TaskForm 
                onSuccess={handleTaskFormSuccess}
                onCancel={() => setOpen(false)}
                isRegularUser={isRegularUser}
              />
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
        ) : role === 'manager' ? (
          <div className="space-y-8">
            {/* Tasks Assigned to Manager */}
            <div>
              <h2 className="text-2xl font-bold mb-4">My Assigned Tasks</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {["To Do", "In Progress", "Done"].map((status) => {
                  const columnTasks = tasks.filter(
                    (t) => t.status === status && 
                    t.approval_status === 'approved' && 
                    t.assigned_to === currentUserId
                  );
                  
                  return (
                    <Card key={status} className="shadow-md bg-gradient-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold">{status}</h3>
                          <Badge variant="secondary">{columnTasks.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {columnTasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No {status.toLowerCase()} tasks
                            </p>
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
                                
                                {task.completion_status === 'pending_confirmation' && (
                                  <Badge variant="outline" className="mb-2 border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Awaiting Confirmation
                                  </Badge>
                                )}
                                {task.completion_status === 'confirmed' && (
                                  <div className="mb-2 space-y-1">
                                    <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20">
                                      ✓ Confirmed
                                    </Badge>
                                    {task.completion_comments && (
                                      <p className="text-xs text-muted-foreground italic mt-1">
                                        Admin note: {task.completion_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-3">
                                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  {task.due_date && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      {task.due_date}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 flex gap-2 flex-wrap">
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
                })}
              </div>
            </div>
            
            {/* Tasks Created by Manager */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Tasks I Created</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {["To Do", "In Progress", "Done"].map((status) => {
                  const columnTasks = tasks.filter(
                    (t) => t.status === status && 
                    t.approval_status === 'approved' && 
                    t.created_by === currentUserId &&
                    t.assigned_to !== currentUserId
                  );
                  
                  return (
                    <Card key={status} className="shadow-md bg-gradient-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold">{status}</h3>
                          <Badge variant="secondary">{columnTasks.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {columnTasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No {status.toLowerCase()} tasks
                            </p>
                          ) : (
                            columnTasks.map((task) => (
                              <div key={task.id} className="p-4 rounded-lg border border-border bg-background hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-foreground">{task.title}</h4>
                                </div>
                                {task.asset && (
                                  <p className="text-xs text-muted-foreground mb-1">Asset: {task.asset.name}</p>
                                )}
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                                )}
                                
                                {task.completion_status === 'pending_confirmation' && (
                                  <Badge variant="outline" className="mb-2 border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Awaiting Confirmation
                                  </Badge>
                                )}
                                {task.completion_status === 'confirmed' && (
                                  <Badge variant="outline" className="mb-2 border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20">
                                    ✓ Confirmed
                                  </Badge>
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
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderTaskColumn("To Do", "To Do")}
            {renderTaskColumn("In Progress", "In Progress")}
            {renderTaskColumn("Done", "Done")}
          </div>
        )}
        
        {/* Admin Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Task Completion</DialogTitle>
              <DialogDescription>
                Confirm that "{selectedTaskForConfirm?.title}" has been completed successfully.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Comments (Optional)</label>
                <Textarea
                  value={confirmComments}
                  onChange={(e) => setConfirmComments(e.target.value)}
                  placeholder="Add any notes about the completion..."
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setConfirmDialogOpen(false);
                  setSelectedTaskForConfirm(null);
                  setConfirmComments("");
                }}>
                  Cancel
                </Button>
                <Button onClick={confirmTaskCompletion} className="bg-green-600 hover:bg-green-700">
                  Confirm Completion
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
