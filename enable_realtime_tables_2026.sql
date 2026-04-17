
-- Habilitar Realtime para las tablas que el Dashboard escucha
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_module_access;
