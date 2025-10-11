-- Create completion status enum
CREATE TYPE completion_status AS ENUM ('pending_confirmation', 'confirmed');

-- Add completion tracking columns to tasks table
ALTER TABLE tasks 
ADD COLUMN completion_status completion_status,
ADD COLUMN completion_confirmed_by uuid,
ADD COLUMN completion_confirmed_at timestamp with time zone,
ADD COLUMN completion_comments text;

-- Update RLS DELETE policy to only allow admins
DROP POLICY IF EXISTS "Admins and managers can delete tasks" ON tasks;

CREATE POLICY "Only admins can delete tasks" 
ON tasks FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));