import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Wrench, Building2, Plus } from "lucide-react";

const assetCategories = [
  { name: "Vehicles", count: 12, icon: Truck, color: "bg-primary/10 text-primary" },
  { name: "Equipment", count: 18, icon: Package, color: "bg-accent/10 text-accent" },
  { name: "Tools", count: 8, icon: Wrench, color: "bg-success/10 text-success" },
  { name: "Facilities", count: 9, icon: Building2, color: "bg-warning/10 text-warning" },
];

const recentAssets = [
  { id: "FL-001", name: "Forklift Toyota 7FBR", category: "Equipment", status: "Active", lastService: "2025-09-15" },
  { id: "V-003", name: "Delivery Van Ford Transit", category: "Vehicles", status: "Active", lastService: "2025-09-20" },
  { id: "HL-005", name: "Hand Lift Crown PTH", category: "Equipment", status: "Maintenance", lastService: "2025-08-30" },
  { id: "CR-A", name: "Cold Room A", category: "Facilities", status: "Active", lastService: "2025-09-10" },
  { id: "OFF-201", name: "Office Suite 201", category: "Facilities", status: "Active", lastService: "2025-09-05" },
];

export default function Assets() {
  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Asset Registry</h1>
            <p className="text-muted-foreground mt-1">Manage your fleet and equipment</p>
          </div>
          <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            New Asset
          </Button>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assetCategories.map((category) => (
            <Card key={category.name} className="shadow-md bg-gradient-card hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{category.name}</p>
                    <p className="text-3xl font-bold mt-2">{category.count}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${category.color}`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Assets List */}
        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">All Assets</h2>
            <div className="space-y-3">
              {recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{asset.name}</h4>
                      <p className="text-sm text-muted-foreground">ID: {asset.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-muted-foreground">Last Service</p>
                      <p className="text-sm font-medium">{asset.lastService}</p>
                    </div>
                    <Badge variant={asset.status === "Active" ? "default" : "secondary"}>
                      {asset.status}
                    </Badge>
                    <Button variant="outline" size="sm">View</Button>
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
