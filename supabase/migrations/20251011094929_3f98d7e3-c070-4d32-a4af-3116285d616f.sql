-- Step 1: Delete incorrect team member records that don't have matching profiles
DELETE FROM team_members 
WHERE id NOT IN (SELECT id FROM profiles);

-- Step 2: Add foreign key constraint to ensure team_members.id references profiles.id
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS team_members_id_fkey;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_id_fkey 
FOREIGN KEY (id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Step 3: Insert/update the team member record for Andreas Eleftheriou with correct ID
INSERT INTO team_members (id, name, initials, role, email, phone_number, description, active_tasks, completed_tasks)
VALUES (
  '3f887c35-608f-44f0-ac73-3800a34e4349',
  'Andreas Eleftheriou',
  'AE',
  'Manager',
  '0035799243043@maintenancepro.local',
  '0035799243043',
  'Malakas',
  0,
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  initials = EXCLUDED.initials,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  phone_number = EXCLUDED.phone_number,
  description = EXCLUDED.description;