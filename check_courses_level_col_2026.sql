
SELECT id, title, 
  CASE WHEN column_name = 'level' THEN 'has level' ELSE NULL END
FROM public.courses, information_schema.columns 
WHERE table_name = 'courses' AND column_name IN ('level','required_level')
GROUP BY id, title, column_name
LIMIT 5;
