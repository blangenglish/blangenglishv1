
-- Agregar columnas faltantes a payment_history
ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS event_type  text DEFAULT 'payment_approved',
  ADD COLUMN IF NOT EXISTS notes       text,
  ADD COLUMN IF NOT EXISTS created_by  text DEFAULT 'system';

-- Índice para event_type
CREATE INDEX IF NOT EXISTS idx_payment_history_event ON public.payment_history(event_type);

-- Verificar que las columnas existen ahora
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payment_history'
ORDER BY ordinal_position;
