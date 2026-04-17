
-- 1. Eliminar el CHECK constraint restrictivo y agregar uno nuevo que incluya pending_approval
ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Agregar nuevo CHECK con todos los estados válidos
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('trial', 'active', 'cancelled', 'expired', 'pending_approval', 'pending_plan'));

-- 2. Agregar columna renewal_due_at si no existe (la usa el Dashboard)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS renewal_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_enabled BOOLEAN DEFAULT false;

-- 3. Verificar el estado actual de la tabla
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 4. Ver suscripciones actuales
SELECT id, student_id, status, approved_by_admin, account_enabled, plan_slug, current_period_start, current_period_end
FROM public.subscriptions
ORDER BY created_at DESC
LIMIT 10;
