
-- Crear función que puede ser llamada con anon key para debug
-- y que retorna conteo de perfiles
CREATE OR REPLACE FUNCTION public.debug_count_profiles()
RETURNS TABLE(total bigint, admin_only bigint, regular bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_admin_only = true) as admin_only,
    COUNT(*) FILTER (WHERE is_admin_only IS DISTINCT FROM true) as regular
  FROM public.student_profiles;
$$;

GRANT EXECUTE ON FUNCTION public.debug_count_profiles() TO anon, authenticated;
