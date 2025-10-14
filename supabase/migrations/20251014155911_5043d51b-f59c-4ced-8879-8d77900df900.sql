-- Create asset categories table
CREATE TABLE asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text,
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance types table
CREATE TABLE maintenance_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create many-to-many relationship table
CREATE TABLE category_maintenance_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_category_id uuid REFERENCES asset_categories(id) ON DELETE CASCADE,
  maintenance_type_id uuid REFERENCES maintenance_types(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_category_id, maintenance_type_id)
);

-- Create vendor types table
CREATE TABLE vendor_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add vendor_type_id to vendors table
ALTER TABLE vendors ADD COLUMN vendor_type_id uuid REFERENCES vendor_types(id);

-- Enable RLS
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can view, only admins can modify
CREATE POLICY "Anyone authenticated can view asset categories"
  ON asset_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage asset categories"
  ON asset_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view maintenance types"
  ON maintenance_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage maintenance types"
  ON maintenance_types FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view category maintenance types"
  ON category_maintenance_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage category maintenance types"
  ON category_maintenance_types FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view vendor types"
  ON vendor_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage vendor types"
  ON vendor_types FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Seed initial data
INSERT INTO asset_categories (name, icon, color) VALUES
  ('Vehicles', 'Truck', 'blue'),
  ('Equipment', 'Wrench', 'green'),
  ('Tools', 'Hammer', 'orange'),
  ('Facilities', 'Building2', 'purple');

INSERT INTO maintenance_types (name, description) VALUES
  ('Service', 'Regular maintenance service'),
  ('Oil Change', 'Oil and filter replacement'),
  ('Inspection', 'Safety and compliance inspection'),
  ('Tachograph Calibration', 'Tachograph system calibration'),
  ('MOT', 'Ministry of Transport test'),
  ('Brake Service', 'Brake system maintenance'),
  ('Tire Rotation', 'Tire rotation and alignment'),
  ('Parts Replacement', 'Replace worn or damaged parts'),
  ('Calibration', 'Equipment calibration'),
  ('Maintenance', 'General maintenance work');

-- Link maintenance types to categories (based on COMMON_MAINTENANCE_TYPES)
INSERT INTO category_maintenance_types (asset_category_id, maintenance_type_id)
SELECT ac.id, mt.id
FROM asset_categories ac
CROSS JOIN maintenance_types mt
WHERE 
  (ac.name = 'Vehicles' AND mt.name IN ('Service', 'Oil Change', 'Inspection', 'Tachograph Calibration', 'MOT', 'Brake Service', 'Tire Rotation'))
  OR (ac.name = 'Equipment' AND mt.name IN ('Service', 'Oil Change', 'Inspection', 'Parts Replacement'))
  OR (ac.name = 'Tools' AND mt.name IN ('Inspection', 'Calibration', 'Service'))
  OR (ac.name = 'Facilities' AND mt.name IN ('Inspection', 'Maintenance'));

INSERT INTO vendor_types (name, description) VALUES
  ('Mechanic', 'Vehicle and equipment repair'),
  ('Electrician', 'Electrical work and repairs'),
  ('Plumber', 'Plumbing services'),
  ('HVAC Technician', 'Heating and cooling systems'),
  ('General Contractor', 'General construction and maintenance');

-- Add triggers for updated_at
CREATE TRIGGER update_asset_categories_updated_at
  BEFORE UPDATE ON asset_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_types_updated_at
  BEFORE UPDATE ON maintenance_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_types_updated_at
  BEFORE UPDATE ON vendor_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();