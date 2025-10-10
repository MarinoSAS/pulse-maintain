import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "warning" | "success" | "accent";
}

export function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    warning: "border-warning/30 bg-warning/5",
    success: "border-success/30 bg-success/5",
    accent: "border-accent/30 bg-accent/5",
  };

  return (
    <Card className={cn("bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2 text-foreground">{value}</p>
            {trend && (
              <p className={cn(
                "text-sm mt-2 font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl",
            variant === "warning" ? "bg-warning/10" :
            variant === "success" ? "bg-success/10" :
            variant === "accent" ? "bg-accent/10" :
            "bg-primary/10"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              variant === "warning" ? "text-warning" :
              variant === "success" ? "text-success" :
              variant === "accent" ? "text-accent" :
              "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
