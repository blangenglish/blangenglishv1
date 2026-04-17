-- Limpiar y reinsertar con el UUID correcto
DELETE FROM public.admin_users;

INSERT INTO public.admin_users (id, email)
VALUES ('5238041e-0e0c-453d-971f-58c2025b47a0', 'blangenglishlearning@blangenglish.com');

-- Verificar
SELECT id, email, created_at FROM public.admin_users;
