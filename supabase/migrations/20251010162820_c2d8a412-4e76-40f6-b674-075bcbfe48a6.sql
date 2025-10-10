-- Add description field to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS description text;

-- Add name field to invitations so we can pre-fill it
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS invitee_name text;

-- Make email nullable in team_members since some employees won't have email
ALTER TABLE public.team_members
ALTER COLUMN email DROP NOT NULL;

-- Add phone column to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS phone_number text;

-- Make email nullable in invitations
ALTER TABLE public.invitations
ALTER COLUMN email DROP NOT NULL;