import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Plus } from "lucide-react";

const maintenanceSchedule = [
  {
    id: 1,
    asset: "Forklift FL-001",
    type: "Annual Service",
    scheduled: "2025-10-15",
    status: "urgent",
    recurrence: "Yearly",
  },
  {
    id: 2,
    asset: "Van V-003",
    type: "Oil Change",
    scheduled: "2025-10-18",
    status: "upcoming",
    recurrence: "Every 3 months",
  },
  {
    id: 3,
    asset: "Cold Room CR-A",
    type: "Refrigerant Check",
    scheduled: "2025-10-20",
    status: "scheduled",
    recurrence: "Monthly",
  },
  {
    id: 4,
    asset: "Hand Lift HL-005",
    type: "Hydraulic Inspection",
    scheduled: "2025-10-22",
    status: "scheduled",
    recurrence: "Every 6 months",
  },
  {
    id: 5,
    asset: "Van V-001",
    type: "Safety Inspection",
    scheduled: "2025-10-25",
    status: "scheduled",
    recurrence: "Yearly",
  },
];

export default function Maintenance() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "urgent": return "bg-destructive/10 text-destructive border-destructive/20";
      case "upcoming": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-success/10 text-success border-success/20";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "urgent": return "Urgent";
      case "upcoming": return "Soon";
      default: return "Scheduled";
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Maintenance Schedule</h1>
            <p className="text-muted-foreground mt-1">Track and plan maintenance activities</p>
          </div>
          <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Maintenance
          </Button>
        </div>

        {/* Alert Banner */}
        <Card className="border-warning/30 bg-warning/5 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Upcoming Maintenance</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {maintenanceSchedule.filter(m => m.status === "urgent").length} urgent maintenance tasks requiring immediate attention.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Scheduled Maintenance</h2>
            </div>
            <div className="space-y-4">
              {maintenanceSchedule.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-lg border-2 transition-all hover:shadow-md ${getStatusColor(item.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-foreground text-lg">{item.asset}</h4>
                        <Badge variant={item.status === "urgent" ? "destructive" : "default"}>
                          {getStatusBadge(item.status)}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground/80 mb-1">{item.type}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{item.scheduled}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Recurrence: <span className="font-medium">{item.recurrence}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-4">
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
