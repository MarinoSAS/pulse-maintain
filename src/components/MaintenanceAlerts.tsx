import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Gauge, Wrench } from "lucide-react";
import { differenceInDays, format } from "date-fns";

type MaintenanceAlert = {
  asset_id: string;
  asset_name: string;
  maintenance_type: string;
  alert_type: 'overdue' | 'due_soon';
  message: string;
  days_overdue?: number;
  km_over?: number;
};

type Asset = {
  id: string;
  asset_id: string;
  name: string;
  odometer_reading: number | null;
};

type MaintenanceRequirement = {
  id: string;
  asset_id: string;
  maintenance_type: string;
  interval_days: number | null;
  interval_km: number | null;
};

type Expense = {
  id: string;
  asset_id: string;
  category: string;
  date: string;
  odometer_at_service: number | null;
};

export function MaintenanceAlerts() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      // Fetch all assets
      const { data: assets, error: assetsError } = await supabase
        .from("assets")
        .select("id, asset_id, name, odometer_reading");

      if (assetsError) throw assetsError;

      // Fetch all maintenance requirements
      const { data: requirements, error: reqError } = await supabase
        .from("maintenance_requirements")
        .select("*");

      if (reqError) throw reqError;

      // Fetch all expenses for auto-detection
      const { data: expenses, error: expError } = await supabase
        .from("expenses")
        .select("id, asset_id, category, date, odometer_at_service")
        .order("date", { ascending: false });

      if (expError) throw expError;

      const newAlerts: MaintenanceAlert[] = [];
      const today = new Date();

      // Process each requirement
      requirements?.forEach((req) => {
        const asset = assets?.find((a) => a.id === req.asset_id);
        if (!asset) return;

        // Find matching expenses for this requirement
        const matchingExpenses = expenses?.filter(
          (e) => 
            e.asset_id === req.asset_id && 
            e.category.toLowerCase() === req.maintenance_type.toLowerCase()
        ) || [];
        
        const lastExpense = matchingExpenses.length > 0 ? matchingExpenses[0] : null;

        let daysUntilDue: number | null = null;
        let kmUntilDue: number | null = null;

        // Check time-based maintenance
        if (req.interval_days && lastExpense?.date) {
          const lastDate = new Date(lastExpense.date);
          const daysSince = differenceInDays(today, lastDate);
          daysUntilDue = req.interval_days - daysSince;
        }

        // Check km-based maintenance
        if (req.interval_km && lastExpense?.odometer_at_service && asset.odometer_reading) {
          const kmSince = asset.odometer_reading - lastExpense.odometer_at_service;
          kmUntilDue = req.interval_km - kmSince;
        }

        // Determine if alert needed
        const showTimeAlert = daysUntilDue !== null && (daysUntilDue < 0 || daysUntilDue <= 14);
        const showKmAlert = kmUntilDue !== null && (kmUntilDue < 0 || kmUntilDue <= 1000);

        if (showTimeAlert || showKmAlert) {
          const isOverdue = (daysUntilDue !== null && daysUntilDue < 0) || (kmUntilDue !== null && kmUntilDue < 0);
          
          // Build message
          let message = `${req.maintenance_type}`;
          const parts: string[] = [];
          
          if (daysUntilDue !== null) {
            if (daysUntilDue < 0) {
              parts.push(`${Math.abs(daysUntilDue)} days overdue`);
            } else {
              parts.push(`${daysUntilDue} days remaining`);
            }
          }
          
          if (kmUntilDue !== null) {
            if (kmUntilDue < 0) {
              parts.push(`${Math.abs(kmUntilDue).toLocaleString()} km overdue`);
            } else {
              parts.push(`${kmUntilDue.toLocaleString()} km remaining`);
            }
          }
          
          if (parts.length > 0) {
            message += ` - ${parts.join(' / ')}`;
          }

          newAlerts.push({
            asset_id: asset.asset_id,
            asset_name: asset.name,
            maintenance_type: req.maintenance_type,
            alert_type: isOverdue ? 'overdue' : 'due_soon',
            message,
            days_overdue: daysUntilDue !== null && daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined,
            km_over: kmUntilDue !== null && kmUntilDue < 0 ? Math.abs(kmUntilDue) : undefined,
          });
        }
      });

      // Sort: overdue first, then by severity
      newAlerts.sort((a, b) => {
        if (a.alert_type === 'overdue' && b.alert_type !== 'overdue') return -1;
        if (a.alert_type !== 'overdue' && b.alert_type === 'overdue') return 1;
        return 0;
      });

      setAlerts(newAlerts);
    } catch (error) {
      console.error("Failed to load maintenance alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Maintenance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Maintenance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All assets are up to date!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Maintenance Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.asset_id}-${alert.maintenance_type}-${index}`}
              className={`flex items-start justify-between p-3 rounded-lg ${
                alert.alert_type === 'overdue' ? 'bg-destructive/10' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <Wrench className={`w-5 h-5 mt-0.5 ${
                  alert.alert_type === 'overdue' ? 'text-destructive' : 'text-warning'
                }`} />
                <div>
                  <p className="font-semibold text-sm">{alert.asset_name}</p>
                  <p className="text-xs text-muted-foreground">{alert.asset_id}</p>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              </div>
              <Badge variant={alert.alert_type === 'overdue' ? 'destructive' : 'default'}>
                {alert.alert_type === 'overdue' ? 'Overdue' : 'Due Soon'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
