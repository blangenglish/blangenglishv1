SELECT 'courses' as tbl, count(*) FROM public.courses
UNION ALL
SELECT 'units', count(*) FROM public.units  
UNION ALL
SELECT 'unit_stage_materials', count(*) FROM public.unit_stage_materials
UNION ALL
SELECT 'admin_users', count(*) FROM public.admin_users;
