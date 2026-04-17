
-- 1. Obtener el UUID del admin
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM auth.users
  WHERE lower(trim(email)) = 'blangenglishlearning@blangenglish.com'
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'No se encontró usuario con ese correo en auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Admin UUID encontrado: %', admin_id;

  -- 2. Eliminar historial de pagos
  DELETE FROM public.payment_history WHERE student_id = admin_id;
  RAISE NOTICE 'payment_history eliminado';

  -- 3. Eliminar progreso de unidades
  DELETE FROM public.unit_progress WHERE student_id = admin_id;
  RAISE NOTICE 'unit_progress eliminado';

  -- 4. Eliminar acceso a módulos
  DELETE FROM public.student_module_access WHERE student_id = admin_id;
  RAISE NOTICE 'student_module_access eliminado';

  -- 5. Eliminar suscripciones
  DELETE FROM public.subscriptions WHERE student_id = admin_id;
  RAISE NOTICE 'subscriptions eliminado';

  -- 6. Eliminar perfil de estudiante
  DELETE FROM public.student_profiles WHERE id = admin_id;
  RAISE NOTICE 'student_profiles eliminado';

  -- 7. Asegurar que está en admin_users (por si acaso)
  INSERT INTO public.admin_users (id, email)
  VALUES (admin_id, 'blangenglishlearning@blangenglish.com')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RAISE NOTICE 'admin_users asegurado';

END $$;

-- Verificar resultado final
SELECT 
  'auth.users' as tabla,
  id::text,
  email
FROM auth.users
WHERE lower(trim(email)) = 'blangenglishlearning@blangenglish.com'

UNION ALL

SELECT 
  'student_profiles' as tabla,
  id::text,
  full_name
FROM public.student_profiles sp
JOIN auth.users au ON au.id = sp.id
WHERE lower(trim(au.email)) = 'blangenglishlearning@blangenglish.com'

UNION ALL

SELECT 
  'admin_users' as tabla,
  id::text,
  email
FROM public.admin_users
WHERE lower(trim(email)) = 'blangenglishlearning@blangenglish.com';
