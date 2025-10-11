-- Drop constraints if they exist to ensure clean slate
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_created_by_fkey;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_created_by_fkey;

-- Add foreign key for tasks.created_by
ALTER TABLE tasks 
ADD CONSTRAINT tasks_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Add foreign key for assets.created_by
ALTER TABLE assets 
ADD CONSTRAINT assets_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Add foreign key for vendors.created_by
ALTER TABLE vendors 
ADD CONSTRAINT vendors_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;