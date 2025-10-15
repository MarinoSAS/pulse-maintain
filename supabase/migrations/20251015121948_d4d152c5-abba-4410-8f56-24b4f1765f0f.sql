-- Change category column from enum to text type
ALTER TABLE assets 
ALTER COLUMN category TYPE text;

-- Drop the old enum type (no longer needed)
DROP TYPE IF EXISTS asset_category;

-- Add foreign key constraint to ensure category exists in asset_categories
ALTER TABLE assets
ADD CONSTRAINT fk_assets_category 
FOREIGN KEY (category) 
REFERENCES asset_categories(name)
ON DELETE RESTRICT
ON UPDATE CASCADE;