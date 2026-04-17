-- Actualiza TODOS los registros existentes con el email correcto
UPDATE public.admin_users
SET email = 'blangenglishlearning@blangenglish.com';

-- Si no había ninguno, inserta (solo corre si UPDATE no afectó filas)
INSERT INTO public.admin_users (id, email)
SELECT '9885539a-6217-490c-a41f-2ddb103e9520', 'blangenglishlearning@blangenglish.com'
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = '9885539a-6217-490c-a41f-2ddb103e9520');

-- Verificar
SELECT id, email, created_at FROM public.admin_users;
