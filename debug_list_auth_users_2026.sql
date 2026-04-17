
-- Ver todos los usuarios en auth.users
SELECT id, email, raw_user_meta_data->>'full_name' as full_name, created_at
FROM auth.users
ORDER BY created_at;
