SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('subscriptions', 'student_profiles')
ORDER BY tablename, policyname;
