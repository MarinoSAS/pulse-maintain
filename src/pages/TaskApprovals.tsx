import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

type PendingTask = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  asset_id: string | null;
  created_by: string | null;
  created_at: string;
  reporter_name?: string;
  asset_name?: string;
};

type TeamMember = {
  id: string;
  name: string;
};

export default function TaskApprovals() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedPriority, setEditedPriority] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPendingTasks();
    loadTeamMembers();
  }, []);

  const loadPendingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          profiles!tasks_created_by_fkey(full_name),
          assets(name)
        `)
        .eq("approval_status", "pending")
        .eq("is_issue_report", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedTasks = data?.map((task: any) => ({
        ...task,
        reporter_name: task.profiles?.full_name || "Unknown",
        asset_name: task.assets?.name || "No asset",
      })) || [];

      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error loading pending tasks:", error);
      toast({ title: "Error loading tasks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;

      setTeamMembers(data?.map(p => ({ id: p.id, name: p.full_name || "Unknown" })) || []);
    } catch (error) {
      console.error("Error loading team members:", error);
    }
  };

  const openApprovalDialog = (task: PendingTask) => {
    setSelectedTask(task);
    setEditedTitle(task.title);
    setEditedDescription(task.description || "");
    setEditedPriority(task.priority);
    setEditedDueDate("");
    setAssignedTo("");
    setApprovalDialog(true);
  };

  const openRejectDialog = (task: PendingTask) => {
    setSelectedTask(task);
    setRejectionReason("");
    setRejectDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedTask || !assignedTo) {
      toast({ title: "Please assign to a team member", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const updates: any = {
        approval_status: "approved",
        approved_by: userData.user?.id,
        approved_at: new Date().toISOString(),
        assigned_to: assignedTo,
        title: editedTitle,
        description: editedDescription,
        priority: editedPriority,
      };

      if (editedDueDate) {
        updates.due_date = editedDueDate;
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", selectedTask.id);

      if (error) throw error;

      toast({ title: "Task approved successfully" });
      setApprovalDialog(false);
      loadPendingTasks();
    } catch (error) {
      console.error("Error approving task:", error);
      toast({ title: "Error approving task", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selectedTask || !rejectionReason.trim()) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("tasks")
        .update({
          approval_status: "rejected",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedTask.id);

      if (error) throw error;

      toast({ title: "Task rejected" });
      setRejectDialog(false);
      loadPendingTasks();
    } catch (error) {
      console.error("Error rejecting task:", error);
      toast({ title: "Error rejecting task", variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent": return "destructive";
      case "High": return "destructive";
      case "Medium": return "default";
      case "Low": return "secondary";
      default: return "default";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Task Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve pending task submissions
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No pending task approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <div className="flex gap-2 items-center text-sm text-muted-foreground">
                        <span>Reported by: {task.reporter_name}</span>
                        <span>•</span>
                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Asset</p>
                      <p className="text-sm text-muted-foreground">{task.asset_name}</p>
                    </div>
                    {task.description && (
                      <div>
                        <p className="text-sm font-medium">Description</p>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={() => openApprovalDialog(task)} size="sm">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button onClick={() => openRejectDialog(task)} variant="destructive" size="sm">
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assign To *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={editedPriority} onValueChange={setEditedPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date (Optional)</Label>
                <Input type="date" value={editedDueDate} onChange={(e) => setEditedDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>Cancel</Button>
            <Button onClick={handleApprove}>Approve Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Rejection Reason *</Label>
            <Textarea 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this task is being rejected..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
