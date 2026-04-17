
-- 1. Eliminar todos los datos de estudiante del correo admin
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT au.id INTO admin_id
  FROM auth.users au
  WHERE lower(trim(au.email)) = 'blangenglishlearning@blangenglish.com'
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'No se encontró usuario con ese correo';
    RETURN;
  END IF;

  RAISE NOTICE 'Limpiando datos de estudiante para UUID: %', admin_id;

  DELETE FROM public.payment_history     WHERE student_id = admin_id;
  DELETE FROM public.unit_progress        WHERE student_id = admin_id;
  DELETE FROM public.student_module_access WHERE student_id = admin_id;
  DELETE FROM public.subscriptions        WHERE student_id = admin_id;
  DELETE FROM public.student_profiles     WHERE id = admin_id;

  -- Asegurar registro en admin_users
  INSERT INTO public.admin_users (id, email)
  VALUES (admin_id, 'blangenglishlearning@blangenglish.com')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  RAISE NOTICE 'Listo. Datos de estudiante eliminados, admin_users asegurado.';
END $$;

-- Verificar: student_profiles NO debe tener ese correo
SELECT au.id, au.email, 'admin_users OK' as estado
FROM auth.users au
JOIN public.admin_users adm ON adm.id = au.id
WHERE lower(trim(au.email)) = 'blangenglishlearning@blangenglish.com';
