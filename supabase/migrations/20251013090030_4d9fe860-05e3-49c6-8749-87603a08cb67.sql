-- Create maintenance_requirements table
CREATE TABLE public.maintenance_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  interval_days INTEGER,
  interval_km INTEGER,
  last_completed_at DATE,
  last_completed_odometer INTEGER,
  last_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_interval CHECK (interval_days IS NOT NULL OR interval_km IS NOT NULL)
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone authenticated can view maintenance requirements" 
ON public.maintenance_requirements 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and managers can create maintenance requirements" 
ON public.maintenance_requirements 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update maintenance requirements" 
ON public.maintenance_requirements 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete maintenance requirements" 
ON public.maintenance_requirements 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_maintenance_requirements_updated_at
BEFORE UPDATE ON public.maintenance_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add requirement_id to expenses to link to specific maintenance requirements
ALTER TABLE public.expenses 
ADD COLUMN requirement_id UUID REFERENCES public.maintenance_requirements(id) ON DELETE SET NULL;