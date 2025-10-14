import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertCircle, CheckCircle, Clock, Wrench, TrendingUp, BarChart3 } from "lucide-react";
import { MaintenanceAlerts } from "@/components/MaintenanceAlerts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAssets: 0,
    pendingTasks: 0,
    completedThisMonth: 0,
    monthlyExpenses: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load assets count
      const { data: assets } = await supabase
        .from("assets")
        .select("id", { count: "exact", head: true });
      
      // Load pending tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "To Do");
      
      // Load completed tasks this month
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: completedTasks } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "Done")
        .gte("updated_at", firstDayOfMonth);
      
      // Load monthly expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .gte("date", firstDayOfMonth);
      
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      setStats({
        totalAssets: assets?.length || 0,
        pendingTasks: tasks?.length || 0,
        completedThisMonth: completedTasks?.length || 0,
        monthlyExpenses: totalExpenses
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Overview of your maintenance operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Assets"
            value={loading ? "..." : stats.totalAssets}
            icon={Package}
          />
          <StatCard
            title="Pending Tasks"
            value={loading ? "..." : stats.pendingTasks}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Completed This Month"
            value={loading ? "..." : stats.completedThisMonth}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Monthly Expenses"
            value={loading ? "..." : `$${stats.monthlyExpenses.toLocaleString()}`}
            icon={TrendingUp}
            variant="accent"
          />
        </div>

        {/* Admin Reports Button */}
        {isAdmin && (
          <Card className="bg-gradient-accent border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Advanced Reports & Analytics
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    View detailed expense reports with AI-powered insights
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/reports')}
                  className="shadow-md hover:shadow-lg transition-all"
                >
                  View Full Reports
                  <Badge variant="secondary" className="ml-2">Admin</Badge>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
