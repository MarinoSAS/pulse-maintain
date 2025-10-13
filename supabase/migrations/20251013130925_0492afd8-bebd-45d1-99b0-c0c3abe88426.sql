-- Create company enum type
CREATE TYPE public.company_name AS ENUM ('Unifruit', 'Limnia', 'HRC', 'Other');

-- Add company column to assets table (required, defaults to 'Other')
ALTER TABLE public.assets 
ADD COLUMN company company_name NOT NULL DEFAULT 'Other';

-- Add company column to expenses table (optional, will be auto-populated)
ALTER TABLE public.expenses 
ADD COLUMN company company_name;

-- Create function to auto-populate expense company from asset
CREATE OR REPLACE FUNCTION public.auto_assign_expense_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate expense company from asset company if not explicitly set
  IF NEW.company IS NULL AND NEW.asset_id IS NOT NULL THEN
    SELECT company INTO NEW.company
    FROM public.assets
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to run before insert or update on expenses
CREATE TRIGGER set_expense_company
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_expense_company();