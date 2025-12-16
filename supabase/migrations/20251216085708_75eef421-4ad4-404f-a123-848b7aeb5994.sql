-- Drop the existing foreign key constraint that requires team_members.id to match profiles.id
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_id_fkey;

-- Add a new optional user_id column for team members who DO have login accounts
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create an index for the new column
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);