-- Create team_roles table for dynamic team member roles
CREATE TABLE public.team_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view team roles
CREATE POLICY "Anyone authenticated can view team roles"
ON public.team_roles
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage team roles
CREATE POLICY "Admins can manage team roles"
ON public.team_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default roles
INSERT INTO public.team_roles (name, description) VALUES
  ('Driver', 'Vehicle operator'),
  ('Technician', 'Maintenance technician'),
  ('Contractor', 'External contractor'),
  ('Staff', 'General staff member'),
  ('Other', 'Other role type');