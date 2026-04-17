
-- Ver exactamente qué hay en auth.users para ese correo
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE lower(trim(email)) LIKE '%blangenglish%';

-- Ver qué hay en admin_users
SELECT * FROM public.admin_users;
