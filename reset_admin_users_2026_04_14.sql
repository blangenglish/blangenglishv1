-- Limpiar tabla y dejar solo el admin correcto
DELETE FROM public.admin_users;

-- Insertar con el UUID correcto del usuario en Auth
-- Usamos ambos posibles UUIDs que han aparecido
INSERT INTO public.admin_users (id, email)
SELECT id, email FROM auth.users
WHERE email = 'blangenglishlearning@blangenglish.com'
LIMIT 1;

-- Verificar resultado
SELECT id, email, created_at FROM public.admin_users;
