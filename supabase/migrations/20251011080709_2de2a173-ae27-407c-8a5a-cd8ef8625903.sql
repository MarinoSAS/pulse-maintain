-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Anyone authenticated can view vendors"
  ON public.vendors FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can create vendors"
  ON public.vendors FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update vendors"
  ON public.vendors FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete vendors"
  ON public.vendors FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add vendor_id column to expenses table
ALTER TABLE public.expenses 
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;