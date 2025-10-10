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
        // Check time-based maintenance
        if (asset.maintenance_interval_days && asset.last_maintenance_date) {
          const lastMaintenance = new Date(asset.last_maintenance_date);
          const daysSinceMaintenance = differenceInDays(today, lastMaintenance);
          const daysUntilDue = asset.maintenance_interval_days - daysSinceMaintenance;

          if (daysUntilDue < 0) {
            newAlerts.push({
              asset_id: asset.asset_id,
              asset_name: asset.name,
              alert_type: 'overdue',
              message: `Maintenance overdue by ${Math.abs(daysUntilDue)} days`,
              days_overdue: Math.abs(daysUntilDue),
            });
          } else if (daysUntilDue <= 14) {
            newAlerts.push({
              asset_id: asset.asset_id,
              asset_name: asset.name,
              alert_type: 'due_soon',
              message: `Maintenance due in ${daysUntilDue} days`,
            });
          }
        }

        // Check odometer-based maintenance for vehicles
        if (asset.maintenance_interval_km && asset.odometer_reading && asset.last_maintenance_odometer) {
          const kmSinceMaintenence = asset.odometer_reading - asset.last_maintenance_odometer;
          const kmUntilDue = asset.maintenance_interval_km - kmSinceMaintenence;

          if (kmUntilDue < 0) {
            newAlerts.push({
              asset_id: asset.asset_id,
              asset_name: asset.name,
              alert_type: 'km_threshold',
              message: `Maintenance overdue by ${Math.abs(kmUntilDue)} km`,
              km_over: Math.abs(kmUntilDue),
            });
          } else if (kmUntilDue <= 1000) {
            newAlerts.push({
              asset_id: asset.asset_id,
              asset_name: asset.name,
              alert_type: 'due_soon',
              message: `Maintenance due in ${kmUntilDue} km`,
            });
          }
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
