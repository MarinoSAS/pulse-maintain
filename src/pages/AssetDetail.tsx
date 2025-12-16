import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import {
  ArrowLeft,
  Package,
  DollarSign,
  Calendar,
  Gauge,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  FileText,
  Wrench,
  Receipt,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { MaintenanceRequirements, MaintenanceRequirement } from "@/components/MaintenanceRequirements";

type TeamMember = {
  id: string;
  name: string;
  role: string;
};

type AssetCategory = {
  id: string;
  name: string;
};

type Asset = {
  id: string;
  asset_id: string;
  name: string;
  description: string | null;
  category: string;
  company: 'Unifruit' | 'Limnia' | 'HRC' | 'Other';
  status: string;
  assigned_to: string | null;
  last_service: string | null;
  odometer_reading: number | null;
  maintenance_interval_days: number | null;
  maintenance_interval_km: number | null;
  last_maintenance_date: string | null;
  last_maintenance_odometer: number | null;
  created_at: string;
  team_member?: { id: string; name: string; role: string } | null;
};

type MaintenanceReq = {
  id: string;
  maintenance_type: string;
  interval_days: number | null;
  interval_km: number | null;
  last_completed_at: string | null;
  last_completed_odometer: number | null;
};

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  invoice_number: string | null;
  vendor: string | null;
};

type MaintenanceSchedule = {
  id: string;
  maintenance_type: string;
  scheduled_date: string;
  completed: boolean;
  completed_date: string | null;
  notes: string | null;
};

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
  const [requirements, setRequirements] = useState<MaintenanceReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseFilter, setExpenseFilter] = useState("all");
  const [maintenanceFilter, setMaintenanceFilter] = useState("all");
  const { isAdmin, isManager } = useUserRole();
  
  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editForm, setEditForm] = useState({
    asset_id: "",
    name: "",
    description: "",
    category: "",
    company: "" as 'Unifruit' | 'Limnia' | 'HRC' | 'Other',
    status: "" as 'Active' | 'Maintenance' | 'Inactive',
    assigned_to: "__none__",
    last_service: "",
    odometer_reading: "",
  });

  useEffect(() => {
    if (id) {
      loadAssetData();
    }
  }, [id]);

  useEffect(() => {
    if (editOpen && asset) {
      loadEditFormData();
      setEditForm({
        asset_id: asset.asset_id,
        name: asset.name,
        description: asset.description || "",
        category: asset.category,
        company: asset.company,
        status: asset.status as 'Active' | 'Maintenance' | 'Inactive',
        assigned_to: asset.assigned_to || "__none__",
        last_service: asset.last_service || "",
        odometer_reading: asset.odometer_reading?.toString() || "",
      });
    }
  }, [editOpen, asset]);

  const loadEditFormData = async () => {
    const [categoriesRes, teamRes] = await Promise.all([
      supabase.from("asset_categories").select("id, name").order("name"),
      supabase.from("team_members").select("id, name, role").order("name"),
    ]);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (teamRes.data) setTeamMembers(teamRes.data);
  };

  const handleEditSubmit = async () => {
    if (!editForm.asset_id || !editForm.name || !editForm.category) {
      toast.error("Please fill in required fields (Asset ID, Name, Category)");
      return;
    }

    try {
      setEditLoading(true);
      const { error } = await supabase
        .from("assets")
        .update({
          asset_id: editForm.asset_id,
          name: editForm.name,
          description: editForm.description || null,
          category: editForm.category,
          company: editForm.company,
          status: editForm.status,
          assigned_to: editForm.assigned_to === "__none__" ? null : editForm.assigned_to || null,
          last_service: editForm.last_service || null,
          odometer_reading: editForm.odometer_reading ? parseInt(editForm.odometer_reading) : null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Asset updated successfully");
      setEditOpen(false);
      loadAssetData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update asset");
    } finally {
      setEditLoading(false);
    }
  };

  const loadAssetData = async () => {
    try {
      setLoading(true);

      // Fetch asset details
      const { data: assetData, error: assetError } = await supabase
        .from("assets")
        .select(`
          *,
          team_member:team_members(id, name, role)
        `)
        .eq("id", id)
        .single();

      if (assetError) throw assetError;
      setAsset(assetData);

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("asset_id", id)
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      // Fetch maintenance schedules
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("asset_id", id)
        .order("scheduled_date", { ascending: false });

      if (maintenanceError) throw maintenanceError;
      setMaintenance(maintenanceData || []);

      // Fetch maintenance requirements
      const { data: reqData, error: reqError } = await supabase
        .from("maintenance_requirements")
        .select("*")
        .eq("asset_id", id)
        .order("maintenance_type");

      if (reqError) throw reqError;
      setRequirements(reqData || []);
    } catch (error: any) {
      toast.error("Failed to load asset details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    switch (expenseFilter) {
      case "30days":
        return expenses.filter((e) => differenceInDays(now, new Date(e.date)) <= 30);
      case "90days":
        return expenses.filter((e) => differenceInDays(now, new Date(e.date)) <= 90);
      case "year":
        return expenses.filter((e) => differenceInDays(now, new Date(e.date)) <= 365);
      default:
        return expenses;
    }
  };

  const getFilteredMaintenance = () => {
    switch (maintenanceFilter) {
      case "completed":
        return maintenance.filter((m) => m.completed);
      case "pending":
        return maintenance.filter((m) => !m.completed);
      default:
        return maintenance;
    }
  };

  const calculateTotalExpenses = () => {
    return getFilteredExpenses().reduce((sum, expense) => sum + Number(expense.amount), 0);
  };

  const getNextMaintenance = () => {
    const upcoming = maintenance.filter((m) => !m.completed && new Date(m.scheduled_date) >= new Date());
    return upcoming.length > 0 ? upcoming[upcoming.length - 1] : null;
  };

  const getOverdueMaintenance = () => {
    return maintenance.filter((m) => !m.completed && new Date(m.scheduled_date) < new Date());
  };

  const getDaysSinceLastMaintenance = () => {
    if (!asset?.last_maintenance_date) return null;
    return differenceInDays(new Date(), new Date(asset.last_maintenance_date));
  };

  const getMaintenanceStatus = (schedule: MaintenanceSchedule) => {
    if (schedule.completed) return "completed";
    const scheduledDate = new Date(schedule.scheduled_date);
    const now = new Date();
    if (scheduledDate < now) return "overdue";
    if (differenceInDays(scheduledDate, now) <= 7) return "upcoming";
    return "scheduled";
  };

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/10 text-success border-success/30">Completed</Badge>;
      case "overdue":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Overdue</Badge>;
      case "upcoming":
        return <Badge className="bg-warning/10 text-warning border-warning/30">Upcoming</Badge>;
      default:
        return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  const deleteAsset = async () => {
    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Asset deleted successfully");
      navigate("/assets");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete asset");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Loading asset details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!asset) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Asset not found</p>
            <Button onClick={() => navigate("/assets")} className="mt-4">
              Back to Assets
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredExpenses = getFilteredExpenses();
  const filteredMaintenance = getFilteredMaintenance();
  const totalExpenses = calculateTotalExpenses();
  const nextMaintenance = getNextMaintenance();
  const overdueMaintenance = getOverdueMaintenance();
  const daysSinceLastMaintenance = getDaysSinceLastMaintenance();

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/assets")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-foreground">{asset.name}</h1>
              <Badge variant={asset.status === "Active" ? "default" : "secondary"}>
                {asset.status}
              </Badge>
              <Badge variant="secondary">{asset.company}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              ID: {asset.asset_id} • {asset.category}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            {(isAdmin || isManager) && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Asset
              </Button>
            )}
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Asset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {asset.name} and all associated expenses, maintenance schedules, and tasks. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={deleteAsset}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Edit Asset Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Asset</DialogTitle>
              <DialogDescription>
                Update the asset details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset_id">Asset ID *</Label>
                  <Input
                    id="asset_id"
                    value={editForm.asset_id}
                    onChange={(e) => setEditForm({ ...editForm, asset_id: e.target.value })}
                    placeholder="e.g., VEH-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Asset name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Asset description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Select
                    value={editForm.company}
                    onValueChange={(value) => setEditForm({ ...editForm, company: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unifruit">Unifruit</SelectItem>
                      <SelectItem value="Limnia">Limnia</SelectItem>
                      <SelectItem value="HRC">HRC</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select
                    value={editForm.assigned_to}
                    onValueChange={(value) => setEditForm({ ...editForm, assigned_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="last_service">Last Service Date</Label>
                  <Input
                    id="last_service"
                    type="date"
                    value={editForm.last_service}
                    onChange={(e) => setEditForm({ ...editForm, last_service: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odometer">Odometer (km)</Label>
                  <Input
                    id="odometer"
                    type="number"
                    value={editForm.odometer_reading}
                    onChange={(e) => setEditForm({ ...editForm, odometer_reading: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} disabled={editLoading}>
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Expenses"
            value={`€${totalExpenses.toFixed(2)}`}
            icon={DollarSign}
            variant="accent"
          />
          <StatCard
            title="Maintenance Tasks"
            value={`${maintenance.filter((m) => m.completed).length}/${maintenance.length}`}
            icon={CheckCircle2}
            variant={overdueMaintenance.length > 0 ? "warning" : "success"}
          />
          <StatCard
            title="Days Since Service"
            value={daysSinceLastMaintenance ?? "N/A"}
            icon={Calendar}
            variant="default"
          />
          {asset.odometer_reading && (
            <StatCard
              title="Odometer"
              value={`${asset.odometer_reading.toLocaleString()} km`}
              icon={Gauge}
              variant="default"
            />
          )}
        </div>

        {/* Overdue Alerts */}
        {overdueMaintenance.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">
                    {overdueMaintenance.length} Overdue Maintenance Task{overdueMaintenance.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This asset has maintenance tasks that are past their scheduled date
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

          {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requirements">
              Requirements ({requirements.length})
            </TabsTrigger>
            <TabsTrigger value="expenses">
              Expenses ({expenses.length})
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              Maintenance ({maintenance.length})
            </TabsTrigger>
            <TabsTrigger value="history">Service History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Asset Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{asset.company}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{asset.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{asset.status}</p>
                  </div>
                  {asset.team_member && (
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned To</p>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{asset.team_member.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {asset.team_member.role}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{format(new Date(asset.created_at), "PPP")}</p>
                  </div>
                  {asset.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm mt-1">{asset.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Maintenance Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {asset.maintenance_interval_days && (
                    <div>
                      <p className="text-sm text-muted-foreground">Interval (Days)</p>
                      <p className="font-medium">{asset.maintenance_interval_days} days</p>
                    </div>
                  )}
                  {asset.maintenance_interval_km && (
                    <div>
                      <p className="text-sm text-muted-foreground">Interval (Kilometers)</p>
                      <p className="font-medium">{asset.maintenance_interval_km.toLocaleString()} km</p>
                    </div>
                  )}
                  {asset.last_maintenance_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Last Maintenance</p>
                      <p className="font-medium">{format(new Date(asset.last_maintenance_date), "PPP")}</p>
                    </div>
                  )}
                  {asset.last_maintenance_odometer && (
                    <div>
                      <p className="text-sm text-muted-foreground">Last Maintenance Odometer</p>
                      <p className="font-medium">{asset.last_maintenance_odometer.toLocaleString()} km</p>
                    </div>
                  )}
                  {nextMaintenance && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Next Scheduled</p>
                      <p className="font-medium text-warning">
                        {nextMaintenance.maintenance_type} - {format(new Date(nextMaintenance.scheduled_date), "PPP")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                {requirements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No maintenance requirements defined</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requirements.map((req) => {
                      const daysSinceCompleted = req.last_completed_at 
                        ? differenceInDays(new Date(), new Date(req.last_completed_at))
                        : null;
                      const kmSinceCompleted = req.last_completed_odometer && asset?.odometer_reading
                        ? asset.odometer_reading - req.last_completed_odometer
                        : null;

                      const isDueByDays = req.interval_days && daysSinceCompleted !== null && daysSinceCompleted >= req.interval_days;
                      const isDueByKm = req.interval_km && kmSinceCompleted !== null && kmSinceCompleted >= req.interval_km;
                      const isDue = isDueByDays || isDueByKm;

                      return (
                        <div
                          key={req.id}
                          className={`p-4 rounded-lg border ${
                            isDue ? 'border-warning bg-warning/5' : 'bg-background/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-muted-foreground" />
                                <p className="font-medium">{req.maintenance_type}</p>
                                {isDue && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Due</Badge>}
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                {req.interval_days && (
                                  <p>• Every {req.interval_days} days
                                    {daysSinceCompleted !== null && ` (${daysSinceCompleted} days since last)`}
                                  </p>
                                )}
                                {req.interval_km && (
                                  <p>• Every {req.interval_km.toLocaleString()} km
                                    {kmSinceCompleted !== null && ` (${kmSinceCompleted.toLocaleString()} km since last)`}
                                  </p>
                                )}
                                {req.last_completed_at && (
                                  <p className="text-xs mt-1">
                                    Last completed: {format(new Date(req.last_completed_at), "PPP")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Expense History</CardTitle>
                  <select
                    value={expenseFilter}
                    onChange={(e) => setExpenseFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border rounded-md bg-background"
                  >
                    <option value="all">All Time</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted-foreground">Total for Selected Period</p>
                  <p className="text-3xl font-bold text-accent mt-1">
                    €{totalExpenses.toFixed(2)}
                  </p>
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No expenses recorded for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-background/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{expense.description}</p>
                            <Badge variant="outline" className="text-xs">
                              {expense.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{format(new Date(expense.date), "PPP")}</span>
                            {expense.vendor && <span>• {expense.vendor}</span>}
                            {expense.invoice_number && <span>• #{expense.invoice_number}</span>}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-accent">
                          €{Number(expense.amount).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Maintenance Schedule</CardTitle>
                  <select
                    value={maintenanceFilter}
                    onChange={(e) => setMaintenanceFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border rounded-md bg-background"
                  >
                    <option value="all">Show All</option>
                    <option value="completed">Completed Only</option>
                    <option value="pending">Pending Only</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredMaintenance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No maintenance scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMaintenance.map((schedule) => {
                      const status = getMaintenanceStatus(schedule);
                      return (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-background/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{schedule.maintenance_type}</p>
                              {getMaintenanceStatusBadge(status)}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>Scheduled: {format(new Date(schedule.scheduled_date), "PPP")}</span>
                            </div>
                            {schedule.completed && schedule.completed_date && (
                              <div className="flex items-center gap-2 mt-1 text-sm text-success">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Completed: {format(new Date(schedule.completed_date), "PPP")}</span>
                              </div>
                            )}
                            {schedule.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{schedule.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service History Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 && maintenance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No service history available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Combine and sort maintenance and expenses */}
                    {[
                      ...maintenance.filter((m) => m.completed).map((m) => ({
                        type: "maintenance" as const,
                        date: m.completed_date || m.scheduled_date,
                        title: m.maintenance_type,
                        notes: m.notes,
                      })),
                      ...expenses.map((e) => ({
                        type: "expense" as const,
                        date: e.date,
                        title: e.description,
                        amount: e.amount,
                        category: e.category,
                      })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((event, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                event.type === "maintenance"
                                  ? "bg-success/10 text-success"
                                  : "bg-accent/10 text-accent"
                              }`}
                            >
                              {event.type === "maintenance" ? (
                                <Wrench className="w-5 h-5" />
                              ) : (
                                <DollarSign className="w-5 h-5" />
                              )}
                            </div>
                            {idx < maintenance.filter((m) => m.completed).length + expenses.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-8">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.date), "PPP")}
                            </p>
                            <p className="font-medium mt-1">{event.title}</p>
                            {event.type === "expense" && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {event.category}
                                </Badge>
                                <span className="font-bold text-accent">
                                  €{Number(event.amount).toFixed(2)}
                                </span>
                              </div>
                            )}
                            {event.type === "maintenance" && event.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
