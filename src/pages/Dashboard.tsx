import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertCircle, CheckCircle, Clock, Wrench, TrendingUp } from "lucide-react";
import { MaintenanceAlerts } from "@/components/MaintenanceAlerts";

export default function Dashboard() {
  const upcomingMaintenance = [
    { id: 1, asset: "Forklift FL-001", type: "Annual Service", date: "2025-10-15", status: "urgent" },
    { id: 2, asset: "Van V-003", type: "Oil Change", date: "2025-10-18", status: "soon" },
    { id: 3, asset: "Cold Room CR-A", type: "Refrigerant Check", date: "2025-10-20", status: "scheduled" },
  ];

  const recentTasks = [
    { id: 1, title: "Replace brake pads - FL-002", assignee: "John Smith", status: "completed" },
    { id: 2, title: "Clean air filters - Office A", assignee: "Sarah Jones", status: "in-progress" },
    { id: 3, title: "Inspect hydraulics - HL-005", assignee: "Mike Johnson", status: "pending" },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your maintenance operations</p>
          </div>
          <Button className="bg-gradient-accent shadow-md hover:shadow-lg transition-all">
            <Package className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Assets"
            value={47}
            icon={Package}
            trend={{ value: "5 this month", isPositive: true }}
          />
          <StatCard
            title="Pending Tasks"
            value={12}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Completed This Month"
            value={28}
            icon={CheckCircle}
            variant="success"
            trend={{ value: "15% increase", isPositive: true }}
          />
          <StatCard
            title="Monthly Expenses"
            value="$8,450"
            icon={TrendingUp}
            variant="accent"
          />
        </div>

        {/* Maintenance Alerts */}
        <MaintenanceAlerts />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Maintenance */}
          <Card className="shadow-md bg-gradient-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertCircle className="w-5 h-5 text-warning" />
                Upcoming Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {upcomingMaintenance.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{item.asset}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.type}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'urgent' ? 'bg-destructive/10 text-destructive' :
                      item.status === 'soon' ? 'bg-warning/10 text-warning' :
                      'bg-success/10 text-success'
                    }`}>
                      {item.status === 'urgent' ? 'Urgent' : item.status === 'soon' ? 'Soon' : 'Scheduled'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className="shadow-md bg-gradient-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Wrench className="w-5 h-5 text-primary" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{task.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">Assigned to: {task.assignee}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      task.status === 'completed' ? 'bg-success/10 text-success' :
                      task.status === 'in-progress' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {task.status === 'completed' ? 'Completed' : task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                    </span>
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
