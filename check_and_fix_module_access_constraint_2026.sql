
-- Ver constraints actuales de la tabla
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.student_module_access'::regclass;
