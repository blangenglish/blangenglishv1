
-- Ver todas las políticas de student_profiles
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'student_profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;
