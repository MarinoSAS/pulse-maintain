import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AlertTriangle, TrendingUp, TrendingDown, Fuel, Gauge } from "lucide-react";

interface FuelRecord {
  id: string;
  asset_id: string;
  company: string;
  record_date: string;
  liters: number;
  month_year: string;
}

interface Asset {
  id: string;
  name: string;
  asset_id: string;
  company: string;
  odometer_reading: number | null;
}

interface Expense {
  id: string;
  asset_id: string;
  odometer_at_service: number | null;
  date: string;
}

interface TruckConsumption {
  assetId: string;
  assetName: string;
  company: string;
  totalLiters: number;
  latestOdometer: number | null;
  previousOdometer: number | null;
  kmDriven: number | null;
  litersPer100km: number | null;
  isAnomaly: boolean;
}

export function FuelReports() {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadFuelRecordsForMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load assets
      const { data: assetsData } = await supabase
        .from("assets")
        .select("id, name, asset_id, company, odometer_reading");
      setAssets(assetsData || []);

      // Load expenses with odometer readings
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("id, asset_id, odometer_at_service, date")
        .not("odometer_at_service", "is", null)
        .order("date", { ascending: false });
      setExpenses(expensesData || []);

      // Load available months from fuel records
      const { data: monthsData } = await supabase
        .from("fuel_records")
        .select("month_year")
        .order("month_year", { ascending: false });

      const uniqueMonths = [...new Set((monthsData || []).map(r => r.month_year))];
      setAvailableMonths(uniqueMonths);

      if (uniqueMonths.length > 0) {
        setSelectedMonth(uniqueMonths[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFuelRecordsForMonth = async (month: string) => {
    const { data } = await supabase
      .from("fuel_records")
      .select("*")
      .eq("month_year", month);
    setFuelRecords(data || []);
  };

  // Calculate consumption per truck
  const calculateConsumption = (): TruckConsumption[] => {
    const truckMap = new Map<string, TruckConsumption>();

    // Group fuel records by asset
    fuelRecords.forEach(record => {
      const asset = assets.find(a => a.id === record.asset_id);
      if (!asset) return;

      const existing = truckMap.get(record.asset_id);
      if (existing) {
        existing.totalLiters += Number(record.liters);
      } else {
        // Find odometer readings for this asset
        const assetExpenses = expenses.filter(e => e.asset_id === record.asset_id);
        const latestOdometer = assetExpenses[0]?.odometer_at_service || asset.odometer_reading;
        const previousOdometer = assetExpenses[1]?.odometer_at_service || null;

        truckMap.set(record.asset_id, {
          assetId: record.asset_id,
          assetName: asset.name,
          company: asset.company,
          totalLiters: Number(record.liters),
          latestOdometer,
          previousOdometer,
          kmDriven: null,
          litersPer100km: null,
          isAnomaly: false,
        });
      }
    });

    // Calculate L/100km
    const trucks = Array.from(truckMap.values());
    trucks.forEach(truck => {
      if (truck.latestOdometer && truck.previousOdometer) {
        truck.kmDriven = truck.latestOdometer - truck.previousOdometer;
        if (truck.kmDriven > 0) {
          truck.litersPer100km = (truck.totalLiters / truck.kmDriven) * 100;
        }
      }
    });

    // Calculate fleet average and detect anomalies (>20% above average)
    const trucksWithConsumption = trucks.filter(t => t.litersPer100km !== null);
    if (trucksWithConsumption.length > 0) {
      const avgConsumption = trucksWithConsumption.reduce((sum, t) => sum + (t.litersPer100km || 0), 0) / trucksWithConsumption.length;
      const threshold = avgConsumption * 1.2;
      
      trucks.forEach(truck => {
        if (truck.litersPer100km && truck.litersPer100km > threshold) {
          truck.isAnomaly = true;
        }
      });
    }

    return trucks.sort((a, b) => b.totalLiters - a.totalLiters);
  };

  const truckConsumption = calculateConsumption();
  const totalLiters = truckConsumption.reduce((sum, t) => sum + t.totalLiters, 0);
  const anomalyCount = truckConsumption.filter(t => t.isAnomaly).length;
  const avgConsumption = truckConsumption.filter(t => t.litersPer100km).length > 0
    ? truckConsumption.filter(t => t.litersPer100km).reduce((sum, t) => sum + (t.litersPer100km || 0), 0) / truckConsumption.filter(t => t.litersPer100km).length
    : 0;

  // Chart data - consumption by company
  const companyData = [
    { name: "Unifruit", liters: truckConsumption.filter(t => t.company === "Unifruit").reduce((sum, t) => sum + t.totalLiters, 0) },
    { name: "Limnia", liters: truckConsumption.filter(t => t.company === "Limnia").reduce((sum, t) => sum + t.totalLiters, 0) },
    { name: "HRC", liters: truckConsumption.filter(t => t.company === "HRC").reduce((sum, t) => sum + t.totalLiters, 0) },
  ].filter(d => d.liters > 0);

  // Chart data - top trucks by consumption
  const topTrucksData = truckConsumption.slice(0, 10).map(t => ({
    name: t.assetName,
    liters: t.totalLiters,
    lPer100km: t.litersPer100km || 0,
  }));

  const chartConfig = {
    liters: {
      label: "Liters",
      color: "hsl(var(--primary))",
    },
    lPer100km: {
      label: "L/100km",
      color: "hsl(var(--accent))",
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (availableMonths.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Fuel className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Fuel Data</h3>
          <p className="text-muted-foreground">
            Upload a fuel report in the "Upload Report" tab to see analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month selector and summary stats */}
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Consumption</p>
                <p className="text-3xl font-bold">{totalLiters.toLocaleString()} L</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Fuel className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fleet Average</p>
                <p className="text-3xl font-bold">{avgConsumption.toFixed(1)} L/100km</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <Gauge className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Anomalies Detected</p>
                <p className={`text-3xl font-bold ${anomalyCount > 0 ? "text-destructive" : "text-green-600"}`}>
                  {anomalyCount}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${anomalyCount > 0 ? "bg-destructive/10" : "bg-green-500/10"}`}>
                <AlertTriangle className={`w-6 h-6 ${anomalyCount > 0 ? "text-destructive" : "text-green-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="w-full md:w-48">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(month => (
                <SelectItem key={month} value={month}>
                  {new Date(month).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Consumption by Company</CardTitle>
            <CardDescription>Total liters consumed per company</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="liters" fill="var(--color-liters)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Trucks by Consumption</CardTitle>
            <CardDescription>Highest fuel consumers this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTrucksData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="liters" fill="var(--color-liters)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed table */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Consumption Details</CardTitle>
          <CardDescription>
            Trucks with consumption &gt;20% above fleet average are flagged as anomalies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Truck</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Total Liters</TableHead>
                  <TableHead className="text-right">KM Driven</TableHead>
                  <TableHead className="text-right">L/100km</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {truckConsumption.map(truck => (
                  <TableRow key={truck.assetId} className={truck.isAnomaly ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{truck.assetName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{truck.company}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{truck.totalLiters.toFixed(1)} L</TableCell>
                    <TableCell className="text-right">
                      {truck.kmDriven ? `${truck.kmDriven.toLocaleString()} km` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {truck.litersPer100km ? (
                        <span className={truck.isAnomaly ? "text-destructive font-bold" : ""}>
                          {truck.litersPer100km.toFixed(1)}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {truck.isAnomaly ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          Anomaly
                        </Badge>
                      ) : truck.litersPer100km ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          Normal
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No odometer data</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
