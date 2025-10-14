import { Link, useLocation } from "react-router-dom";
import { Home, Package, ClipboardList, Calendar, DollarSign, Users, LogOut, Store, CheckSquare, Menu, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

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
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Asset Approvals", href: "/assets/approvals", icon: CheckSquare },
  { name: "Task Approvals", href: "/tasks/approvals", icon: CheckSquare },
  { name: "Vendor Approvals", href: "/vendors/approvals", icon: CheckSquare },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const SidebarContent = () => (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {baseNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSheetOpen(false)}
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
                  onClick={() => setSheetOpen(false)}
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
    </>
  );

  return (
    <div className="flex h-screen bg-background w-full">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-2xl font-bold text-sidebar-primary">MaintenancePro</h1>
            <p className="text-sm text-sidebar-foreground/70 mt-1">Fleet & Asset Manager</p>
          </div>
          <SidebarContent />
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border z-40 flex items-center justify-between px-4">
          <h1 className="text-lg font-bold text-sidebar-primary">MaintenancePro</h1>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <div className="p-6 border-b border-sidebar-border">
                <h1 className="text-2xl font-bold text-sidebar-primary">MaintenancePro</h1>
                <p className="text-sm text-sidebar-foreground/70 mt-1">Fleet & Asset Manager</p>
              </div>
              <div className="flex flex-col h-[calc(100vh-88px)]">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Main content */}
      <div className={cn(
        "flex-1 overflow-auto",
        isMobile && "pt-14 pb-16"
      )}>
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-sidebar-border z-40 flex items-center justify-around px-2">
          {[
            { name: "Dashboard", href: "/", icon: Home },
            { name: "Assets", href: "/assets", icon: Package },
            { name: "Tasks", href: "/tasks", icon: ClipboardList },
            { name: "Expenses", href: "/expenses", icon: DollarSign },
            { name: "Team", href: "/team", icon: Users },
          ].map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                  isActive
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-sidebar-accent-foreground")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
