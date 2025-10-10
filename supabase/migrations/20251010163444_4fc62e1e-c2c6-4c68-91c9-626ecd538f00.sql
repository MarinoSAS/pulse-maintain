-- Create helper to fetch email securely without RLS issues
create or replace function public.get_user_email(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from auth.users where id = _user_id;
$$;

-- Replace risky policy that queried auth.users directly
DROP POLICY IF EXISTS "Users can view their own invitation" ON public.invitations;

CREATE POLICY "Users can view their own invitation"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  email is not null AND email = public.get_user_email(auth.uid())
);