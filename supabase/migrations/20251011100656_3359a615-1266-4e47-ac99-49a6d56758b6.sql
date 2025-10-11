-- Backfill team_members for all existing users who don't have an entry yet
INSERT INTO team_members (id, name, initials, role, email, phone_number, active_tasks, completed_tasks)
SELECT
  u.id,
  COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS name,
  UPPER(
    LEFT(split_part(COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), ' ', 1), 1) ||
    LEFT(split_part(COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), ' ', 2), 1)
  ) AS initials,
  CASE
    WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') THEN 'Administrator'
    ELSE 'Manager'
  END AS role,
  u.email,
  u.raw_user_meta_data->>'phone_number' AS phone_number,
  0, 0
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = u.id);