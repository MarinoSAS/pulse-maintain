-- Add new columns to tasks table for enhanced task management
ALTER TABLE tasks 
  ADD COLUMN company company_name,
  ADD COLUMN maintenance_type text,
  ADD COLUMN approximate_cost numeric CHECK (approximate_cost > 0),
  ADD COLUMN assigned_vendors uuid[],
  ADD COLUMN assigned_team_members uuid[];

-- Create index for better query performance
CREATE INDEX idx_tasks_company ON tasks(company);
CREATE INDEX idx_tasks_assigned_team_members ON tasks USING GIN(assigned_team_members);
CREATE INDEX idx_tasks_assigned_vendors ON tasks USING GIN(assigned_vendors);