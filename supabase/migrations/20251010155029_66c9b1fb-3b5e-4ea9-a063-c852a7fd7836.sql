-- Add invitation fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invitation_token text UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invited_at timestamp with time zone;

-- Add maintenance interval fields to assets
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS odometer_reading integer,
ADD COLUMN IF NOT EXISTS maintenance_interval_days integer,
ADD COLUMN IF NOT EXISTS maintenance_interval_km integer,
ADD COLUMN IF NOT EXISTS last_maintenance_date date,
ADD COLUMN IF NOT EXISTS last_maintenance_odometer integer;

-- Create invitations table for pending invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'manager',
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  accepted boolean DEFAULT false
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own invitation"
ON public.invitations
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Update RLS policies for team_members to require admin role
DROP POLICY IF EXISTS "Admins and supervisors can manage team members" ON public.team_members;
CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Update assets RLS to allow managers
DROP POLICY IF EXISTS "Admins and supervisors can manage assets" ON public.assets;
DROP POLICY IF EXISTS "Admins and supervisors can update assets" ON public.assets;

CREATE POLICY "Admins and managers can create assets"
ON public.assets
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update assets"
ON public.assets
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Update expenses RLS to allow managers
DROP POLICY IF EXISTS "Admins and supervisors can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins and supervisors can update expenses" ON public.expenses;

CREATE POLICY "Admins and managers can create expenses"
ON public.expenses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update expenses"
ON public.expenses
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Update tasks RLS
DROP POLICY IF EXISTS "Admins and supervisors can delete tasks" ON public.tasks;
CREATE POLICY "Admins and managers can delete tasks"
ON public.tasks
FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));