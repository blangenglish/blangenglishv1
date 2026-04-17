-- El admin ya existe, solo actualizamos el email
UPDATE public.admin_users
SET email = 'brian.herrera.ramirez@gmail.com'
WHERE id = '8f5379ef-0381-4d86-aa73-47986ffa2dad';

-- Verificar resultado
SELECT id, email, created_at FROM public.admin_users;
