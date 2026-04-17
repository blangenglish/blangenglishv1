
-- Habilitar Realtime en student_profiles para que el Dashboard reciba cambios en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;

-- También habilitar para subscriptions (para cambios de plan)
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
