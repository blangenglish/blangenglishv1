
-- Ver qué registros existen para ese correo
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  sp.full_name,
  sp.id as profile_id
FROM auth.users au
LEFT JOIN public.student_profiles sp ON sp.id = au.id
WHERE lower(trim(au.email)) = 'blangenglishlearning@blangenglish.com';
