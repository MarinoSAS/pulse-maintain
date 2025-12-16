import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type MaintenanceRequirement = {
  id?: string;
  maintenance_type: string;
  interval_days?: number | null;
  interval_km?: number | null;
};

type MaintenanceRequirementsProps = {
  assetId?: string;
  category?: string;
  value: MaintenanceRequirement[];
  onChange: (requirements: MaintenanceRequirement[]) => void;
  readOnly?: boolean;
};

export function MaintenanceRequirements({
  category,
  value,
  onChange,
  readOnly = false,
}: MaintenanceRequirementsProps) {
  const [maintenanceTypes, setMaintenanceTypes] = useState<string[]>([]);

  useEffect(() => {
    const loadMaintenanceTypes = async () => {
      if (!category) {
        setMaintenanceTypes([]);
        return;
      }

      // 1. Get the asset category ID by name
      const { data: categoryData } = await supabase
        .from("asset_categories")
        .select("id")
        .eq("name", category)
        .maybeSingle();

      if (!categoryData) {
        setMaintenanceTypes([]);
        return;
      }

      // 2. Get linked maintenance type IDs from junction table
      const { data: linkData } = await supabase
        .from("category_maintenance_types")
        .select("maintenance_type_id")
        .eq("asset_category_id", categoryData.id);

      if (!linkData?.length) {
        setMaintenanceTypes([]);
        return;
      }

      // 3. Get maintenance type names
      const typeIds = linkData.map((l) => l.maintenance_type_id).filter(Boolean);
      const { data: types } = await supabase
        .from("maintenance_types")
        .select("name")
        .in("id", typeIds);

      setMaintenanceTypes(types?.map((t) => t.name) || []);
    };

    loadMaintenanceTypes();
  }, [category]);

  // Controlled component - use value prop directly, no local state for requirements
  const addRequirement = () => {
    const newReq: MaintenanceRequirement = {
      maintenance_type: "",
      interval_days: null,
      interval_km: null,
    };
    onChange([...value, newReq]);
  };

  const removeRequirement = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateRequirement = (index: number, field: keyof MaintenanceRequirement, fieldValue: any) => {
    const updated = value.map((req, i) => 
      i === index ? { ...req, [field]: fieldValue } : req
    );
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Maintenance Requirements
          </CardTitle>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRequirement}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Requirement
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {value.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No maintenance requirements defined</p>
            {!readOnly && category && (
              <p className="text-sm mt-2">
                Add maintenance requirements to track service intervals
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {value.map((req, index) => (
              <div
                key={req.id || `new-${index}`}
                className="p-4 border border-border rounded-lg space-y-3 bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`type-${index}`}>Maintenance Type</Label>
                      {readOnly ? (
                        <p className="mt-1 font-medium">{req.maintenance_type}</p>
                      ) : (
                        <Select
                          value={req.maintenance_type}
                          onValueChange={(val) =>
                            updateRequirement(index, "maintenance_type", val)
                          }
                        >
                          <SelectTrigger id={`type-${index}`} className="mt-1">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {maintenanceTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`days-${index}`}>Interval (Days)</Label>
                        {readOnly ? (
                          <p className="mt-1 font-medium">
                            {req.interval_days ? `${req.interval_days} days` : "N/A"}
                          </p>
                        ) : (
                          <Input
                            id={`days-${index}`}
                            type="number"
                            placeholder="e.g., 365"
                            value={req.interval_days || ""}
                            onChange={(e) =>
                              updateRequirement(
                                index,
                                "interval_days",
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="mt-1"
                          />
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`km-${index}`}>Interval (km)</Label>
                        {readOnly ? (
                          <p className="mt-1 font-medium">
                            {req.interval_km ? `${req.interval_km.toLocaleString()} km` : "N/A"}
                          </p>
                        ) : (
                          <Input
                            id={`km-${index}`}
                            type="number"
                            placeholder="e.g., 10000"
                            value={req.interval_km || ""}
                            onChange={(e) =>
                              updateRequirement(
                                index,
                                "interval_km",
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="mt-1"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequirement(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
