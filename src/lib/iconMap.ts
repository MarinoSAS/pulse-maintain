import { 
  Truck, 
  Package, 
  Wrench, 
  Building2, 
  Hammer, 
  Factory,
  Cog,
  Warehouse,
  Car,
  Forklift,
  Snowflake,
  LucideIcon 
} from "lucide-react";

// Map icon names (strings from database) to Lucide React components
export const iconMap: Record<string, LucideIcon> = {
  Truck,
  Package,
  Wrench,
  Building2,
  Hammer,
  Factory,
  Cog,
  Warehouse,
  Car,
  car: Car, // Support lowercase
  Forklift,
  Snowflake,
};

// Get icon component by name, with fallback to Package
export const getIconComponent = (iconName: string | null): LucideIcon => {
  if (!iconName) return Package;
  return iconMap[iconName] || Package;
};
