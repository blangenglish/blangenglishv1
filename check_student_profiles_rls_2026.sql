
-- Ver las políticas actuales de student_profiles
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'student_profiles' AND schemaname = 'public'
ORDER BY policyname;
