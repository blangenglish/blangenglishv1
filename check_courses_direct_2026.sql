SELECT id, title, is_published,
  (SELECT column_default FROM information_schema.columns WHERE table_name='courses' AND column_name='level' LIMIT 1) as level_exists,
  (SELECT column_default FROM information_schema.columns WHERE table_name='courses' AND column_name='required_level' LIMIT 1) as req_level_exists
FROM public.courses LIMIT 5;
