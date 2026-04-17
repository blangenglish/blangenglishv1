-- Ver todos los usuarios registrados en Supabase Auth
SELECT id, email, created_at, confirmed_at
FROM auth.users
ORDER BY created_at DESC;
