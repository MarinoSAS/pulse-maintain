import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface AssetCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  asset_count?: number;
}

interface MaintenanceType {
  id: string;
  name: string;
  description: string | null;
  categories?: AssetCategory[];
}

interface VendorType {
  id: string;
  name: string;
  description: string | null;
  vendor_count?: number;
}

interface TeamRole {
  id: string;
  name: string;
  description: string | null;
  member_count?: number;
}

export default function Settings() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  // Asset Categories
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [categoryColor, setCategoryColor] = useState("");
  const [deleteCategory, setDeleteCategory] = useState<AssetCategory | null>(null);

  // Maintenance Types
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MaintenanceType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [deleteType, setDeleteType] = useState<MaintenanceType | null>(null);

  // Vendor Types
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([]);
  const [vendorTypeDialogOpen, setVendorTypeDialogOpen] = useState(false);
  const [editingVendorType, setEditingVendorType] = useState<VendorType | null>(null);
  const [vendorTypeName, setVendorTypeName] = useState("");
  const [vendorTypeDescription, setVendorTypeDescription] = useState("");
  const [deleteVendorType, setDeleteVendorType] = useState<VendorType | null>(null);

  // Team Roles
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [teamRoleDialogOpen, setTeamRoleDialogOpen] = useState(false);
  const [editingTeamRole, setEditingTeamRole] = useState<TeamRole | null>(null);
  const [teamRoleName, setTeamRoleName] = useState("");
  const [teamRoleDescription, setTeamRoleDescription] = useState("");
  const [deleteTeamRole, setDeleteTeamRole] = useState<TeamRole | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadAssetCategories();
      loadMaintenanceTypes();
      loadVendorTypes();
      loadTeamRoles();
    }
  }, [isAdmin]);

  // Asset Categories Functions
  const loadAssetCategories = async () => {
    try {
      // Load categories and assets count in parallel
      const [categoriesResult, assetsResult] = await Promise.all([
        supabase.from("asset_categories").select("*"),
        supabase.from("assets").select("category")
      ]);

      if (categoriesResult.error) throw categoriesResult.error;

      const categoriesWithCounts = (categoriesResult.data || []).map(cat => ({
        ...cat,
        asset_count: (assetsResult.data || []).filter(a => a.category === cat.name).length
      }));

      setAssetCategories(categoriesWithCounts);
    } catch (error: any) {
      toast.error(`Failed to load asset categories: ${error.message}`);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("asset_categories")
          .update({
            name: categoryName,
            icon: categoryIcon || null,
            color: categoryColor || null,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase
          .from("asset_categories")
          .insert({
            name: categoryName,
            icon: categoryIcon || null,
            color: categoryColor || null,
          });

        if (error) throw error;
        toast.success("Category created successfully");
      }

      clearCategoryFields();
      setCategoryDialogOpen(false);
      loadAssetCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;

    try {
      const { error } = await supabase
        .from("asset_categories")
        .delete()
        .eq("id", deleteCategory.id);

      if (error) throw error;
      toast.success("Category deleted successfully");
      setDeleteCategory(null);
      loadAssetCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    }
  };

  const clearCategoryFields = () => {
    setCategoryName("");
    setCategoryIcon("");
    setCategoryColor("");
    setEditingCategory(null);
  };

  // Maintenance Types Functions
  const loadMaintenanceTypes = async () => {
    try {
      const { data: types, error } = await supabase
        .from("maintenance_types")
        .select("*");

      if (error) throw error;

      // Load categories for each type
      const typesWithCategories = await Promise.all(
        (types || []).map(async (type) => {
          const { data: links } = await supabase
            .from("category_maintenance_types")
            .select("asset_categories(*)")
            .eq("maintenance_type_id", type.id);

          return {
            ...type,
            categories: links?.map((link: any) => link.asset_categories) || [],
          };
        })
      );

      setMaintenanceTypes(typesWithCategories);
    } catch (error: any) {
      toast.error("Failed to load maintenance types");
    }
  };

  const handleSaveMaintenanceType = async () => {
    if (!typeName.trim()) {
      toast.error("Maintenance type name is required");
      return;
    }

    try {
      let typeId = editingType?.id;

      if (editingType) {
        const { error } = await supabase
          .from("maintenance_types")
          .update({
            name: typeName,
            description: typeDescription || null,
          })
          .eq("id", editingType.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("maintenance_types")
          .insert({
            name: typeName,
            description: typeDescription || null,
          })
          .select()
          .single();

        if (error) throw error;
        typeId = data.id;
      }

      // Update category links
      if (typeId) {
        // Delete existing links
        await supabase
          .from("category_maintenance_types")
          .delete()
          .eq("maintenance_type_id", typeId);

        // Insert new links
        if (selectedCategories.length > 0) {
          await supabase
            .from("category_maintenance_types")
            .insert(
              selectedCategories.map((catId) => ({
                maintenance_type_id: typeId,
                asset_category_id: catId,
              }))
            );
        }
      }

      toast.success(editingType ? "Type updated successfully" : "Type created successfully");
      clearTypeFields();
      setTypeDialogOpen(false);
      loadMaintenanceTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to save maintenance type");
    }
  };

  const handleDeleteMaintenanceType = async () => {
    if (!deleteType) return;

    try {
      const { error } = await supabase
        .from("maintenance_types")
        .delete()
        .eq("id", deleteType.id);

      if (error) throw error;
      toast.success("Maintenance type deleted successfully");
      setDeleteType(null);
      loadMaintenanceTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete type");
    }
  };

  const clearTypeFields = () => {
    setTypeName("");
    setTypeDescription("");
    setSelectedCategories([]);
    setEditingType(null);
  };

  const openEditType = (type: MaintenanceType) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeDescription(type.description || "");
    setSelectedCategories(type.categories?.map((c) => c.id) || []);
    setTypeDialogOpen(true);
  };

  // Vendor Types Functions
  const loadVendorTypes = async () => {
    try {
      // Load vendor types and vendors count in parallel
      const [typesResult, vendorsResult] = await Promise.all([
        supabase.from("vendor_types").select("*"),
        supabase.from("vendors").select("vendor_type_id")
      ]);

      if (typesResult.error) throw typesResult.error;

      const typesWithCounts = (typesResult.data || []).map(type => ({
        ...type,
        vendor_count: (vendorsResult.data || []).filter(v => v.vendor_type_id === type.id).length
      }));

      setVendorTypes(typesWithCounts);
    } catch (error: any) {
      toast.error(`Failed to load vendor types: ${error.message}`);
    }
  };

  const handleSaveVendorType = async () => {
    if (!vendorTypeName.trim()) {
      toast.error("Vendor type name is required");
      return;
    }

    try {
      if (editingVendorType) {
        const { error } = await supabase
          .from("vendor_types")
          .update({
            name: vendorTypeName,
            description: vendorTypeDescription || null,
          })
          .eq("id", editingVendorType.id);

        if (error) throw error;
        toast.success("Vendor type updated successfully");
      } else {
        const { error } = await supabase
          .from("vendor_types")
          .insert({
            name: vendorTypeName,
            description: vendorTypeDescription || null,
          });

        if (error) throw error;
        toast.success("Vendor type created successfully");
      }

      clearVendorTypeFields();
      setVendorTypeDialogOpen(false);
      loadVendorTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to save vendor type");
    }
  };

  const handleDeleteVendorType = async () => {
    if (!deleteVendorType) return;

    try {
      const { error } = await supabase
        .from("vendor_types")
        .delete()
        .eq("id", deleteVendorType.id);

      if (error) throw error;
      toast.success("Vendor type deleted successfully");
      setDeleteVendorType(null);
      loadVendorTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete vendor type");
    }
  };

  const clearVendorTypeFields = () => {
    setVendorTypeName("");
    setVendorTypeDescription("");
    setEditingVendorType(null);
  };

  // Team Roles Functions
  const loadTeamRoles = async () => {
    try {
      // Load team roles and members count in parallel
      const [rolesResult, membersResult] = await Promise.all([
        supabase.from("team_roles").select("*").order("name"),
        supabase.from("team_members").select("role")
      ]);

      if (rolesResult.error) throw rolesResult.error;

      const rolesWithCounts = (rolesResult.data || []).map(role => ({
        ...role,
        member_count: (membersResult.data || []).filter(m => m.role === role.name).length
      }));

      setTeamRoles(rolesWithCounts);
    } catch (error: any) {
      toast.error(`Failed to load team roles: ${error.message}`);
    }
  };

  const handleSaveTeamRole = async () => {
    if (!teamRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      if (editingTeamRole) {
        const { error } = await supabase
          .from("team_roles")
          .update({
            name: teamRoleName,
            description: teamRoleDescription || null,
          })
          .eq("id", editingTeamRole.id);

        if (error) throw error;
        toast.success("Role updated successfully");
      } else {
        const { error } = await supabase
          .from("team_roles")
          .insert({
            name: teamRoleName,
            description: teamRoleDescription || null,
          });

        if (error) throw error;
        toast.success("Role created successfully");
      }

      clearTeamRoleFields();
      setTeamRoleDialogOpen(false);
      loadTeamRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to save role");
    }
  };

  const handleDeleteTeamRole = async () => {
    if (!deleteTeamRole) return;

    try {
      const { error } = await supabase
        .from("team_roles")
        .delete()
        .eq("id", deleteTeamRole.id);

      if (error) throw error;
      toast.success("Role deleted successfully");
      setDeleteTeamRole(null);
      loadTeamRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role");
    }
  };

  const clearTeamRoleFields = () => {
    setTeamRoleName("");
    setTeamRoleDescription("");
    setEditingTeamRole(null);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Settings</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 md:mt-1">
            Manage asset categories, maintenance types, vendor types, and team roles
          </p>
        </div>

        <Tabs defaultValue="asset-categories" className="space-y-4 md:space-y-6">
          <TabsList className="flex flex-col md:grid w-full md:grid-cols-4 h-auto md:h-10">
            <TabsTrigger value="asset-categories" className="text-xs md:text-sm">Asset Categories</TabsTrigger>
            <TabsTrigger value="maintenance-types" className="text-xs md:text-sm">Maintenance Types</TabsTrigger>
            <TabsTrigger value="vendor-types" className="text-xs md:text-sm">Vendor Types</TabsTrigger>
            <TabsTrigger value="team-roles" className="text-xs md:text-sm">Team Roles</TabsTrigger>
          </TabsList>

          {/* Asset Categories Tab */}
          <TabsContent value="asset-categories" className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                Manage asset categories and their visual properties
              </p>
              <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
                setCategoryDialogOpen(open);
                if (open) {
                  clearCategoryFields();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Edit Category" : "Add Category"}
                    </DialogTitle>
                    <DialogDescription>
                      Create or modify asset category settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="categoryName">Name *</Label>
                      <Input
                        id="categoryName"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g., Vehicles"
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoryIcon">Icon (Lucide Icon name)</Label>
                      <Input
                        id="categoryIcon"
                        value={categoryIcon}
                        onChange={(e) => setCategoryIcon(e.target.value)}
                        placeholder="e.g., Truck"
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoryColor">Color</Label>
                      <Input
                        id="categoryColor"
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        placeholder="e.g., blue"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => {
                        clearCategoryFields();
                        setCategoryDialogOpen(false);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveCategory}>
                        {editingCategory ? "Update" : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Assets Using</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.icon || "-"}</TableCell>
                        <TableCell>
                          {category.color ? (
                            <Badge variant="outline">{category.color}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{category.asset_count || 0}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryName(category.name);
                              setCategoryIcon(category.icon || "");
                              setCategoryColor(category.color || "");
                              setCategoryDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteCategory(category)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile Card List */}
            <div className="block md:hidden space-y-3">
              {assetCategories.map((category) => (
                <Card key={category.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">Icon: {category.icon || "-"}</p>
                      </div>
                      {category.color && (
                        <Badge variant="outline">{category.color}</Badge>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Assets: </span>
                      {category.asset_count || 0}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryName(category.name);
                          setCategoryIcon(category.icon || "");
                          setCategoryColor(category.color || "");
                          setCategoryDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteCategory(category)}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Maintenance Types Tab */}
          <TabsContent value="maintenance-types" className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                Define maintenance types and link them to asset categories
              </p>
              <Dialog open={typeDialogOpen} onOpenChange={(open) => {
                setTypeDialogOpen(open);
                if (open) {
                  clearTypeFields();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingType ? "Edit Maintenance Type" : "Add Maintenance Type"}
                    </DialogTitle>
                    <DialogDescription>
                      Create or modify maintenance type settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="typeName">Name *</Label>
                      <Input
                        id="typeName"
                        value={typeName}
                        onChange={(e) => setTypeName(e.target.value)}
                        placeholder="e.g., Oil Change"
                      />
                    </div>
                    <div>
                      <Label htmlFor="typeDescription">Description</Label>
                      <Textarea
                        id="typeDescription"
                        value={typeDescription}
                        onChange={(e) => setTypeDescription(e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <Label>Asset Categories</Label>
                      <div className="border rounded-lg p-4 space-y-2 mt-2">
                        {assetCategories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${category.id}`}
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories([...selectedCategories, category.id]);
                                } else {
                                  setSelectedCategories(
                                    selectedCategories.filter((id) => id !== category.id)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`cat-${category.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => {
                        clearTypeFields();
                        setTypeDialogOpen(false);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveMaintenanceType}>
                        {editingType ? "Update" : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Asset Categories</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>{type.description || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {type.categories?.map((cat) => (
                              <Badge key={cat.id} variant="secondary">
                                {cat.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditType(type)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteType(type)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile Card List */}
            <div className="block md:hidden space-y-3">
              {maintenanceTypes.map((type) => (
                <Card key={type.id} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium">{type.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {type.description || "No description"}
                      </p>
                    </div>
                    {type.categories && type.categories.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Categories:</p>
                        <div className="flex flex-wrap gap-1">
                          {type.categories.map((cat) => (
                            <Badge key={cat.id} variant="secondary">
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditType(type)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteType(type)}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vendor Types Tab */}
          <TabsContent value="vendor-types" className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                Manage vendor types and categorizations
              </p>
              <Dialog open={vendorTypeDialogOpen} onOpenChange={(open) => {
                setVendorTypeDialogOpen(open);
                if (open) {
                  clearVendorTypeFields();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingVendorType ? "Edit Vendor Type" : "Add Vendor Type"}
                    </DialogTitle>
                    <DialogDescription>
                      Create or modify vendor type settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="vendorTypeName">Name *</Label>
                      <Input
                        id="vendorTypeName"
                        value={vendorTypeName}
                        onChange={(e) => setVendorTypeName(e.target.value)}
                        placeholder="e.g., Mechanic"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vendorTypeDescription">Description</Label>
                      <Textarea
                        id="vendorTypeDescription"
                        value={vendorTypeDescription}
                        onChange={(e) => setVendorTypeDescription(e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => {
                        clearVendorTypeFields();
                        setVendorTypeDialogOpen(false);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveVendorType}>
                        {editingVendorType ? "Update" : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendors Using</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorTypes.map((vendorType) => (
                      <TableRow key={vendorType.id}>
                        <TableCell className="font-medium">{vendorType.name}</TableCell>
                        <TableCell>{vendorType.description || "-"}</TableCell>
                        <TableCell>{vendorType.vendor_count || 0}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingVendorType(vendorType);
                              setVendorTypeName(vendorType.name);
                              setVendorTypeDescription(vendorType.description || "");
                              setVendorTypeDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteVendorType(vendorType)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile Card List */}
            <div className="block md:hidden space-y-3">
              {vendorTypes.map((vendorType) => (
                <Card key={vendorType.id} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium">{vendorType.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {vendorType.description || "No description"}
                      </p>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Vendors: </span>
                      {vendorType.vendor_count || 0}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingVendorType(vendorType);
                          setVendorTypeName(vendorType.name);
                          setVendorTypeDescription(vendorType.description || "");
                          setVendorTypeDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteVendorType(vendorType)}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Team Roles Tab */}
          <TabsContent value="team-roles" className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                Manage team member roles for task assignment
              </p>
              <Dialog open={teamRoleDialogOpen} onOpenChange={(open) => {
                setTeamRoleDialogOpen(open);
                if (open) {
                  clearTeamRoleFields();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTeamRole ? "Edit Role" : "Add Role"}
                    </DialogTitle>
                    <DialogDescription>
                      Create or modify team member role settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="teamRoleName">Name *</Label>
                      <Input
                        id="teamRoleName"
                        value={teamRoleName}
                        onChange={(e) => setTeamRoleName(e.target.value)}
                        placeholder="e.g., Mechanic"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teamRoleDescription">Description</Label>
                      <Textarea
                        id="teamRoleDescription"
                        value={teamRoleDescription}
                        onChange={(e) => setTeamRoleDescription(e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => {
                        clearTeamRoleFields();
                        setTeamRoleDialogOpen(false);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTeamRole}>
                        {editingTeamRole ? "Update" : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Members Using</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description || "-"}</TableCell>
                        <TableCell>{role.member_count || 0}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTeamRole(role);
                              setTeamRoleName(role.name);
                              setTeamRoleDescription(role.description || "");
                              setTeamRoleDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTeamRole(role)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile Card List */}
            <div className="block md:hidden space-y-3">
              {teamRoles.map((role) => (
                <Card key={role.id} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium">{role.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {role.description || "No description"}
                      </p>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Members: </span>
                      {role.member_count || 0}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTeamRole(role);
                          setTeamRoleName(role.name);
                          setTeamRoleDescription(role.description || "");
                          setTeamRoleDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTeamRole(role)}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmations */}
        <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deleteCategory?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteType} onOpenChange={() => setDeleteType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Maintenance Type?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deleteType?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMaintenanceType}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteVendorType} onOpenChange={() => setDeleteVendorType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vendor Type?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deleteVendorType?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVendorType}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteTeamRole} onOpenChange={() => setDeleteTeamRole(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team Role?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deleteTeamRole?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeamRole}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
