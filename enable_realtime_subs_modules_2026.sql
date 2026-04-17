
-- Agregar solo las tablas que aún no están en Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  EXCEPTION WHEN OTHERS THEN
    -- Ya estaba agregada
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_module_access;
  EXCEPTION WHEN OTHERS THEN
    -- Ya estaba agregada
  END;
END $$;
