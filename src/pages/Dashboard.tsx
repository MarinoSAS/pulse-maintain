import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertCircle, CheckCircle, Clock, Wrench, TrendingUp, BarChart3, CalendarClock } from "lucide-react";
import { MaintenanceAlerts } from "@/components/MaintenanceAlerts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface MaintenanceSchedule {
  id: string;
  maintenance_type: string;
  scheduled_date: string;
  due_by_date: string | null;
  completed: boolean;
  assets: {
    name: string;
    asset_id: string;
  } | null;
}

interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  created_at: string;
  updated_at: string;
  assignee: {
    full_name: string;
  } | null;
  asset: {
    name: string;
  } | null;
}

export default function Dashboard() {
  const { isAdmin, isManager } = useUserRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAssets: 0,
    pendingTasks: 0,
    completedThisMonth: 0,
    monthlyExpenses: 0
  });
  const [loading, setLoading] = useState(true);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceSchedule[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, []);

  const getMaintenanceUrgency = (scheduledDate: string) => {
    const today = new Date();
    const scheduled = new Date(scheduledDate);
    const daysUntil = Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 3) return { status: 'urgent', label: 'Urgent' };
    if (daysUntil <= 7) return { status: 'soon', label: 'Soon' };
    return { status: 'scheduled', label: 'Scheduled' };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setMaintenanceLoading(true);
    setTasksLoading(true);
    
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

      // Load upcoming maintenance
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("maintenance_schedules")
        .select(`
          id,
          maintenance_type,
          scheduled_date,
          due_by_date,
          completed,
          assets:asset_id (
            name,
            asset_id
          )
        `)
        .eq("completed", false)
        .gte("scheduled_date", new Date().toISOString().split('T')[0])
        .order("scheduled_date", { ascending: true })
        .limit(5);

      if (maintenanceError) throw maintenanceError;
      setUpcomingMaintenance(maintenanceData || []);

      // Load recent tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          assigned_to,
          asset:asset_id (
            name
          )
        `)
        .eq("approval_status", "approved")
        .order("updated_at", { ascending: false })
        .limit(5);

      // Fetch assignee names separately
      const tasksWithAssignees = await Promise.all(
        (tasksData || []).map(async (task) => {
          if (task.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.assigned_to)
              .single();
            
            return {
              ...task,
              assignee: profile ? { full_name: profile.full_name } : null
            };
          }
          return { ...task, assignee: null };
        })
      );

      if (tasksError) throw tasksError;
      setRecentTasks(tasksWithAssignees || []);
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setMaintenanceLoading(false);
      setTasksLoading(false);
    }
  };


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
          {!isManager && (
            <StatCard
              title="Monthly Expenses"
              value={loading ? "..." : `€${stats.monthlyExpenses.toLocaleString()}`}
              icon={TrendingUp}
              variant="accent"
            />
          )}
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
            <CardHeader className="border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertCircle className="w-5 h-5 text-warning" />
                Upcoming Maintenance
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/maintenance')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {maintenanceLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : upcomingMaintenance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarClock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="mb-2">No upcoming maintenance scheduled</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/maintenance')}
                    className="mt-2"
                  >
                    Schedule Maintenance
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingMaintenance.map((item) => {
                    const urgency = getMaintenanceUrgency(item.scheduled_date);
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate('/maintenance')}
                        className="flex items-start justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors cursor-pointer"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">
                            {item.assets?.name || 'Unknown Asset'}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">{item.maintenance_type}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(item.scheduled_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          urgency.status === 'urgent' ? 'bg-destructive/10 text-destructive' :
                          urgency.status === 'soon' ? 'bg-warning/10 text-warning' :
                          'bg-success/10 text-success'
                        }`}>
                          {urgency.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className="shadow-md bg-gradient-card">
            <CardHeader className="border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Wrench className="w-5 h-5 text-primary" />
                Recent Tasks
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/tasks')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {tasksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="mb-2">No tasks yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/tasks')}
                    className="mt-2"
                  >
                    View Tasks
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate('/tasks')}
                      className="flex items-start justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors cursor-pointer"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{task.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.assignee?.full_name ? `Assigned to: ${task.assignee.full_name}` : 'Unassigned'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'Done' ? 'bg-success/10 text-success' :
                        task.status === 'In Progress' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
