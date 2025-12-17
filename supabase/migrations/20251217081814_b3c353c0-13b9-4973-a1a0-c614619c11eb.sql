-- Fix RLS policies: Convert all RESTRICTIVE SELECT policies to PERMISSIVE
-- The issue is that all policies were created as RESTRICTIVE which blocks all access

-- Drop and recreate SELECT policies as PERMISSIVE for all tables

-- asset_categories
DROP POLICY IF EXISTS "Anyone authenticated can view asset categories" ON public.asset_categories;
CREATE POLICY "Anyone authenticated can view asset categories" ON public.asset_categories AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- maintenance_schedules
DROP POLICY IF EXISTS "Anyone authenticated can view maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Anyone authenticated can view maintenance schedules" ON public.maintenance_schedules AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can create maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Anyone authenticated can create maintenance schedules" ON public.maintenance_schedules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone authenticated can update maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Anyone authenticated can update maintenance schedules" ON public.maintenance_schedules AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

-- category_maintenance_types
DROP POLICY IF EXISTS "Anyone authenticated can view category maintenance types" ON public.category_maintenance_types;
CREATE POLICY "Anyone authenticated can view category maintenance types" ON public.category_maintenance_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- vendors
DROP POLICY IF EXISTS "Users can view approved vendors" ON public.vendors;
CREATE POLICY "Users can view approved vendors" ON public.vendors AS PERMISSIVE FOR SELECT TO authenticated USING (approval_status = 'approved' OR has_role(auth.uid(), 'admin'::app_role));

-- maintenance_requirements
DROP POLICY IF EXISTS "Anyone authenticated can view maintenance requirements" ON public.maintenance_requirements;
CREATE POLICY "Anyone authenticated can view maintenance requirements" ON public.maintenance_requirements AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- expenses
DROP POLICY IF EXISTS "Anyone authenticated can view expenses" ON public.expenses;
CREATE POLICY "Anyone authenticated can view expenses" ON public.expenses AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- vendor_types
DROP POLICY IF EXISTS "Anyone authenticated can view vendor types" ON public.vendor_types;
CREATE POLICY "Anyone authenticated can view vendor types" ON public.vendor_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- maintenance_types
DROP POLICY IF EXISTS "Anyone authenticated can view maintenance types" ON public.maintenance_types;
CREATE POLICY "Anyone authenticated can view maintenance types" ON public.maintenance_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- assets
DROP POLICY IF EXISTS "Users can view approved assets" ON public.assets;
CREATE POLICY "Users can view approved assets" ON public.assets AS PERMISSIVE FOR SELECT TO authenticated USING (approval_status = 'approved' OR has_role(auth.uid(), 'admin'::app_role));

-- tasks
DROP POLICY IF EXISTS "Users can view approved tasks or own reports" ON public.tasks;
CREATE POLICY "Users can view approved tasks or own reports" ON public.tasks AS PERMISSIVE FOR SELECT TO authenticated USING (approval_status = 'approved' OR (is_issue_report = true AND created_by = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
CREATE POLICY "Admins can view all tasks" ON public.tasks AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone authenticated can update tasks" ON public.tasks;
CREATE POLICY "Anyone authenticated can update tasks" ON public.tasks AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;
CREATE POLICY "Anyone can view invitation by token" ON public.invitations AS PERMISSIVE FOR SELECT USING (token IS NOT NULL AND accepted = false AND expires_at > now());

DROP POLICY IF EXISTS "Users can view their own invitation" ON public.invitations;
CREATE POLICY "Users can view their own invitation" ON public.invitations AS PERMISSIVE FOR SELECT TO authenticated USING (email IS NOT NULL AND email = get_user_email(auth.uid()));

-- team_members
DROP POLICY IF EXISTS "Anyone authenticated can view team members" ON public.team_members;
CREATE POLICY "Anyone authenticated can view team members" ON public.team_members AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- team_roles
DROP POLICY IF EXISTS "Anyone authenticated can view team roles" ON public.team_roles;
CREATE POLICY "Anyone authenticated can view team roles" ON public.team_roles AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- Create fuel_records table for fuel consumption tracking
CREATE TABLE IF NOT EXISTS public.fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  company TEXT NOT NULL CHECK (company IN ('Limnia', 'Unifruit', 'HRC', 'Other')),
  record_date DATE NOT NULL,
  record_time TIME,
  liters DECIMAL NOT NULL,
  cost DECIMAL,
  month_year DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, record_date, record_time)
);

-- Enable RLS on fuel_records
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies for fuel_records
CREATE POLICY "Anyone authenticated can view fuel records" ON public.fuel_records AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can insert fuel records" ON public.fuel_records AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Admins and managers can update fuel records" ON public.fuel_records AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Admins can delete fuel records" ON public.fuel_records AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on fuel_records
CREATE TRIGGER update_fuel_records_updated_at
  BEFORE UPDATE ON public.fuel_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();