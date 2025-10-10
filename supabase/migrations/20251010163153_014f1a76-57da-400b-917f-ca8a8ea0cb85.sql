-- Allow anyone to view invitations by token (for accepting invitations)
CREATE POLICY "Anyone can view invitation by token"
ON public.invitations
FOR SELECT
TO anon, authenticated
USING (
  token IS NOT NULL 
  AND accepted = false 
  AND expires_at > now()
);