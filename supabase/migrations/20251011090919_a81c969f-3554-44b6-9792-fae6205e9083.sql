-- Add approval workflow columns to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approval workflow columns to vendors table
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing records to be approved by default
UPDATE public.assets SET approval_status = 'approved' WHERE approval_status IS NULL;
UPDATE public.vendors SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Drop existing restrictive policies for assets
DROP POLICY IF EXISTS "Admins and managers can create assets" ON public.assets;
DROP POLICY IF EXISTS "Anyone authenticated can view assets" ON public.assets;

-- Create new RLS policies for assets with approval workflow
CREATE POLICY "Users can view approved assets"
ON public.assets FOR SELECT
USING (approval_status = 'approved' OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can create pending assets"
ON public.assets FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'manager') AND approval_status = 'pending')
  OR (has_role(auth.uid(), 'admin') AND approval_status = 'approved')
);

CREATE POLICY "Admins can approve and update assets"
ON public.assets FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Drop existing restrictive policies for vendors
DROP POLICY IF EXISTS "Admins and managers can create vendors" ON public.vendors;
DROP POLICY IF EXISTS "Anyone authenticated can view vendors" ON public.vendors;

-- Create new RLS policies for vendors with approval workflow
CREATE POLICY "Users can view approved vendors"
ON public.vendors FOR SELECT
USING (approval_status = 'approved' OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can create pending vendors"
ON public.vendors FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'manager') AND approval_status = 'pending')
  OR (has_role(auth.uid(), 'admin') AND approval_status = 'approved')
);

CREATE POLICY "Admins can approve and update vendors"
ON public.vendors FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));