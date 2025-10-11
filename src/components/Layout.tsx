import { Link, useLocation } from "react-router-dom";
import { Home, Package, ClipboardList, Calendar, DollarSign, Users, LogOut, Store, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

const baseNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Assets", href: "/assets", icon: Package },
  { name: "Tasks", href: "/tasks", icon: ClipboardList },
  { name: "Maintenance", href: "/maintenance", icon: Calendar },
  { name: "Expenses", href: "/expenses", icon: DollarSign },
  { name: "Vendors", href: "/vendors", icon: Store },
  { name: "Team", href: "/team", icon: Users },
];

const adminOnlyNavigation = [
  { name: "Asset Approvals", href: "/assets/approvals", icon: CheckSquare },
  { name: "Task Approvals", href: "/tasks/approvals", icon: CheckSquare },
  { name: "Vendor Approvals", href: "/vendors/approvals", icon: CheckSquare },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  // Expense and task completion notification system for admins
  useEffect(() => {
    if (!isAdmin) return;

    const expensesChannel = supabase
      .channel('expense-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          const expense = payload.new as any;
          toast.info(`New expense added: $${expense.amount} - ${expense.description || 'No description'}`);
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('task-completion-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks'
        },
        async (payload) => {
          const task = payload.new as any;
          if (task.completion_status === 'pending_confirmation') {
            toast.info('Task completed - requires confirmation', {
              description: `"${task.title}" has been marked as done by a manager`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [isAdmin]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-primary">MaintenancePro</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Fleet & Asset Manager</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {baseNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          {isAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Admin
                </p>
              </div>
              {adminOnlyNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-3">
            <p className="text-xs text-sidebar-foreground/60">Logged in as</p>
            <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.email}</p>
          </div>
          <Button
            onClick={signOut}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
