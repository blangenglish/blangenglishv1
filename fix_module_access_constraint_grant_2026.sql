
-- 1. Crear unique constraint si no existe (necesario para upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.student_module_access'::regclass
    AND conname = 'student_module_access_student_id_course_id_key'
  ) THEN
    -- Eliminar duplicados primero si los hay
    DELETE FROM public.student_module_access a
    USING public.student_module_access b
    WHERE a.id > b.id
      AND a.student_id = b.student_id
      AND a.course_id  = b.course_id
      AND (a.unit_id IS NULL AND b.unit_id IS NULL);

    ALTER TABLE public.student_module_access
      ADD CONSTRAINT student_module_access_student_id_course_id_key
      UNIQUE (student_id, course_id);
  END IF;
END $$;

-- 2. Ver estructura de la tabla
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'student_module_access'
ORDER BY ordinal_position;
