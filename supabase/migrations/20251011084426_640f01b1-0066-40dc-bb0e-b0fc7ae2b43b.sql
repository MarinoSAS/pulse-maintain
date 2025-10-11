-- 1. Create maintenance type enum
CREATE TYPE maintenance_type_enum AS ENUM (
  'Service',
  'Oil Change',
  'MOT',
  'Tachograph',
  'Speed Limiter',
  'Repair'
);

-- 2. Enhance tasks table for approval workflow
ALTER TABLE tasks ADD COLUMN approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE tasks ADD COLUMN is_issue_report BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN approved_by UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN rejection_reason TEXT;

-- Update existing tasks to be approved
UPDATE tasks SET approval_status = 'approved' WHERE approval_status IS NULL;

-- 3. Enhance expenses table for maintenance tracking
ALTER TABLE expenses ADD COLUMN maintenance_category maintenance_type_enum;
ALTER TABLE expenses ADD COLUMN odometer_at_service INTEGER;
ALTER TABLE expenses ADD COLUMN next_service_interval_days INTEGER;
ALTER TABLE expenses ADD COLUMN next_service_interval_km INTEGER;

-- 4. Update maintenance_schedules table
ALTER TABLE maintenance_schedules ADD COLUMN maintenance_category maintenance_type_enum;
ALTER TABLE maintenance_schedules ADD COLUMN auto_generated BOOLEAN DEFAULT false;
ALTER TABLE maintenance_schedules ADD COLUMN source_expense_id UUID REFERENCES expenses(id);
ALTER TABLE maintenance_schedules ADD COLUMN due_by_date DATE;
ALTER TABLE maintenance_schedules ADD COLUMN due_by_odometer INTEGER;
ALTER TABLE maintenance_schedules ADD COLUMN triggered_by TEXT CHECK (triggered_by IN ('time', 'odometer', 'both'));

-- 5. Update RLS policies for tasks
DROP POLICY IF EXISTS "Anyone authenticated can view tasks" ON tasks;
DROP POLICY IF EXISTS "Anyone authenticated can create tasks" ON tasks;

-- Users can view approved tasks OR their own pending reports
CREATE POLICY "Users can view approved tasks or own reports"
ON tasks FOR SELECT
USING (
  approval_status = 'approved' 
  OR (is_issue_report = true AND created_by = auth.uid())
);

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks"
ON tasks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create issue reports
CREATE POLICY "Users can create issue reports"
ON tasks FOR INSERT
WITH CHECK (is_issue_report = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Admins/managers can manage tasks
CREATE POLICY "Admins and managers can manage tasks"
ON tasks FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_category ON maintenance_schedules(maintenance_category);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due_by_date ON maintenance_schedules(due_by_date);
CREATE INDEX IF NOT EXISTS idx_expenses_maintenance_category ON expenses(maintenance_category);