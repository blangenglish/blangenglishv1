
-- Ver columnas de la tabla courses
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'courses'
ORDER BY ordinal_position;

-- Ver los cursos con sus niveles
SELECT id, title, level, required_level, is_published
FROM public.courses
ORDER BY sort_order;
