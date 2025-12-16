import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Trash2 } from "lucide-react";
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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { getIconComponent } from "@/lib/iconMap";

type AssetCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  asset_count?: number;
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
  team_member?: { name: string } | null;
};

export default function Assets() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load categories and assets in parallel
      const [categoriesResult, assetsResult] = await Promise.all([
        supabase.from("asset_categories").select("*").order("name"),
        supabase.from("assets").select(`*, team_member:team_members(name)`).order("created_at", { ascending: false })
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (assetsResult.error) throw assetsResult.error;

      const assetsData = assetsResult.data || [];
      setAssets(assetsData);

      // Calculate category counts from assets data
      const categoriesWithCounts = (categoriesResult.data || []).map(cat => ({
        ...cat,
        asset_count: assetsData.filter(asset => asset.category === cat.name).length
      }));
      setCategories(categoriesWithCounts);
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const deleteAsset = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`${name} deleted successfully`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete asset");
    }
  };

  const totalAssets = assets.length;


  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">Asset Registry</h1>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {totalAssets}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Manage your fleet and equipment</p>
          </div>
          <Button 
            className="bg-gradient-accent shadow-md hover:shadow-lg w-full md:w-auto"
            onClick={() => navigate("/assets/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Asset
          </Button>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            return (
              <Card key={category.id} className="shadow-md bg-gradient-card hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{category.name}</p>
                      <p className="text-3xl font-bold mt-2">
                        {category.asset_count || 0}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${category.color || "bg-primary/10 text-primary"}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Assets List */}
        <Card className="shadow-md bg-gradient-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">All Assets</h2>
            {loading ? (
              <div className="text-center py-8">Loading assets...</div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No assets yet. Add your first asset using the button above.
              </div>
            ) : (
              <div className="space-y-3">
                 {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors group hover:border-primary/50"
                  >
                    <div 
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => navigate(`/assets/${asset.id}`)}
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{asset.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {asset.company}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">ID: {asset.asset_id}</p>
                        {asset.description && (
                          <p className="text-sm text-muted-foreground mt-1">{asset.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {asset.team_member && (
                        <div className="text-right hidden lg:block">
                          <p className="text-sm text-muted-foreground">Assigned to</p>
                          <p className="text-sm font-medium">{asset.team_member.name}</p>
                        </div>
                      )}
                      {asset.last_service && (
                        <div className="text-right hidden md:block">
                          <p className="text-sm text-muted-foreground">Last Service</p>
                          <p className="text-sm font-medium">{asset.last_service}</p>
                        </div>
                      )}
                      <Badge variant={asset.status === "Active" ? "default" : "secondary"}>
                        {asset.status}
                      </Badge>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAsset(asset.id, asset.name);
                                }}
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
