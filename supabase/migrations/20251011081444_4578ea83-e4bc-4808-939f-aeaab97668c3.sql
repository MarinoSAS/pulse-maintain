-- Make description column nullable in expenses table
ALTER TABLE public.expenses ALTER COLUMN description DROP NOT NULL;