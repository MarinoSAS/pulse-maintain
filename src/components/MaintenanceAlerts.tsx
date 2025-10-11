import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Gauge } from "lucide-react";
import { differenceInDays } from "date-fns";

type MaintenanceAlert = {
  asset_id: string;
  asset_name: string;
  alert_type: 'overdue' | 'due_soon' | 'km_threshold';
  message: string;
  days_overdue?: number;
  km_over?: number;
};

export function MaintenanceAlerts() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data: assets, error } = await supabase
        .from("assets")
        .select("*")
        .not("maintenance_interval_days", "is", null)
        .or("maintenance_interval_km.not.is.null");

      if (error) throw error;

      const newAlerts: MaintenanceAlert[] = [];
      const today = new Date();

      assets?.forEach((asset) => {
        let daysUntilDue: number | null = null;
        let kmUntilDue: number | null = null;
        let daysPart = '';
        let kmPart = '';

        // Check time-based maintenance
        if (asset.maintenance_interval_days && asset.last_maintenance_date) {
          const lastMaintenance = new Date(asset.last_maintenance_date);
          const daysSinceMaintenance = differenceInDays(today, lastMaintenance);
          daysUntilDue = asset.maintenance_interval_days - daysSinceMaintenance;

          if (daysUntilDue < 0) {
            daysPart = `${Math.abs(daysUntilDue)} days overdue`;
          } else if (daysUntilDue <= 14) {
            const weeks = Math.floor(daysUntilDue / 7);
            const days = daysUntilDue % 7;
            if (weeks > 0) {
              daysPart = `${weeks} week${weeks > 1 ? 's' : ''}${days > 0 ? ` ${days} day${days > 1 ? 's' : ''}` : ''}`;
            } else {
              daysPart = `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
            }
          }
        }

        // Check odometer-based maintenance for vehicles
        if (asset.maintenance_interval_km && asset.odometer_reading && asset.last_maintenance_odometer) {
          const kmSinceMaintenance = asset.odometer_reading - asset.last_maintenance_odometer;
          kmUntilDue = asset.maintenance_interval_km - kmSinceMaintenance;

          if (kmUntilDue < 0) {
            kmPart = `${Math.abs(kmUntilDue).toLocaleString()} km overdue`;
          } else if (kmUntilDue <= 1000) {
            kmPart = `${kmUntilDue.toLocaleString()} km`;
          }
        }

        // Determine if we should show an alert (either condition met)
        const showTimeAlert = daysUntilDue !== null && (daysUntilDue < 0 || daysUntilDue <= 14);
        const showKmAlert = kmUntilDue !== null && (kmUntilDue < 0 || kmUntilDue <= 1000);

        if (showTimeAlert || showKmAlert) {
          const isOverdue = (daysUntilDue !== null && daysUntilDue < 0) || (kmUntilDue !== null && kmUntilDue < 0);
          
          // Build combined message
          let message = 'Service due';
          if (daysPart && kmPart) {
            message = isOverdue 
              ? `Maintenance ${daysPart} or ${kmPart}`
              : `Service due in ${daysPart} or ${kmPart}`;
          } else if (daysPart) {
            message = isOverdue 
              ? `Maintenance ${daysPart}`
              : `Service due in ${daysPart}`;
          } else if (kmPart) {
            message = isOverdue 
              ? `Maintenance ${kmPart}`
              : `Service due in ${kmPart}`;
          }

          newAlerts.push({
            asset_id: asset.asset_id,
            asset_name: asset.name,
            alert_type: isOverdue ? 'overdue' : 'due_soon',
            message,
            days_overdue: daysUntilDue !== null && daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined,
            km_over: kmUntilDue !== null && kmUntilDue < 0 ? Math.abs(kmUntilDue) : undefined,
          });
        }
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
              key={`${alert.asset_id}-${index}`}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-start gap-3">
                {alert.alert_type === 'km_threshold' ? (
                  <Gauge className="w-5 h-5 text-warning mt-0.5" />
                ) : (
                  <Calendar className="w-5 h-5 text-warning mt-0.5" />
                )}
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
