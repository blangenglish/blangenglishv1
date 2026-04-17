-- Insert a sample course if none exist
INSERT INTO public.courses (id, title, description, level, emoji, total_units, sort_order, is_published, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'English A1 - Principiantes',
  'Curso completo para principiantes. Aprende los fundamentos del inglés desde cero.',
  'A1',
  '🌱',
  3,
  1,
  true,
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.courses LIMIT 1);

-- Insert a sample unit linked to the first course
INSERT INTO public.units (id, course_id, title, description, sort_order, is_published, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  c.id,
  'Unidad 1: Presentaciones',
  'Aprende a presentarte y saludar en inglés.',
  1,
  true,
  now(),
  now()
FROM public.courses c
WHERE NOT EXISTS (SELECT 1 FROM public.units LIMIT 1)
LIMIT 1;
