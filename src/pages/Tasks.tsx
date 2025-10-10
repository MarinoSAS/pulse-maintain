import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Clock } from "lucide-react";

const tasks = [
  {
    id: 1,
    title: "Replace brake pads - Forklift FL-002",
    assignee: { name: "John Smith", initials: "JS" },
    priority: "high",
    status: "completed",
    dueDate: "2025-10-12",
  },
  {
    id: 2,
    title: "Clean air filters - Office Suite A",
    assignee: { name: "Sarah Jones", initials: "SJ" },
    priority: "medium",
    status: "in-progress",
    dueDate: "2025-10-14",
  },
  {
    id: 3,
    title: "Inspect hydraulics - Hand Lift HL-005",
    assignee: { name: "Mike Johnson", initials: "MJ" },
    priority: "high",
    status: "pending",
    dueDate: "2025-10-15",
  },
  {
    id: 4,
    title: "Oil change - Van V-003",
    assignee: { name: "Emily Brown", initials: "EB" },
    priority: "medium",
    status: "in-progress",
    dueDate: "2025-10-16",
  },
  {
    id: 5,
    title: "Temperature calibration - Cold Room CR-A",
    assignee: { name: "David Lee", initials: "DL" },
    priority: "low",
    status: "pending",
    dueDate: "2025-10-18",
  },
];

export default function Tasks() {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success";
      case "in-progress": return "bg-warning/10 text-warning";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Task Management</h1>
            <p className="text-muted-foreground mt-1">Assign and track maintenance tasks</p>
          </div>
          <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Task Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending */}
          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Pending</h2>
                <Badge variant="secondary">{tasks.filter(t => t.status === "pending").length}</Badge>
              </div>
              <div className="space-y-3">
                {tasks.filter(t => t.status === "pending").map((task) => (
                  <div key={task.id} className="p-4 rounded-lg border border-border bg-background hover:shadow-md transition-all">
                    <h4 className="font-semibold text-foreground mb-2">{task.title}</h4>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {task.assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                      </div>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {task.dueDate}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">In Progress</h2>
                <Badge variant="secondary">{tasks.filter(t => t.status === "in-progress").length}</Badge>
              </div>
              <div className="space-y-3">
                {tasks.filter(t => t.status === "in-progress").map((task) => (
                  <div key={task.id} className="p-4 rounded-lg border border-border bg-background hover:shadow-md transition-all">
                    <h4 className="font-semibold text-foreground mb-2">{task.title}</h4>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {task.assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                      </div>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {task.dueDate}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Completed</h2>
                <Badge variant="secondary">{tasks.filter(t => t.status === "completed").length}</Badge>
              </div>
              <div className="space-y-3">
                {tasks.filter(t => t.status === "completed").map((task) => (
                  <div key={task.id} className="p-4 rounded-lg border border-border bg-background hover:shadow-md transition-all">
                    <h4 className="font-semibold text-foreground mb-2">{task.title}</h4>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {task.assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                      </div>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {task.dueDate}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
