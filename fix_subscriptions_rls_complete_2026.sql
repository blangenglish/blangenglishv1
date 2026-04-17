-- ============================================================
-- PASO 1: Asegurar que la tabla subscriptions tiene RLS activa
-- con políticas correctas para que el usuario autenticado
-- pueda insertar/actualizar SU PROPIA suscripción
-- ============================================================

-- Habilitar RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Borrar políticas viejas conflictivas
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can upsert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON subscriptions;
DROP POLICY IF EXISTS "Allow authenticated update" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON subscriptions;
DROP POLICY IF EXISTS "Admin full access subscriptions" ON subscriptions;

-- SELECT: el estudiante ve su propia suscripción
CREATE POLICY "sub_select_own"
  ON subscriptions FOR SELECT
  USING (auth.uid() = student_id);

-- INSERT: el estudiante puede crear su propia suscripción
CREATE POLICY "sub_insert_own"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- UPDATE: el estudiante puede actualizar su propia suscripción
CREATE POLICY "sub_update_own"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Service role tiene acceso total (para edge functions)
CREATE POLICY "sub_service_role_all"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- PASO 2: Asegurar RLS en student_profiles también
-- ============================================================

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON student_profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON student_profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON student_profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON student_profiles;

CREATE POLICY "profiles_select_own"
  ON student_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON student_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_service_role"
  ON student_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- PASO 3: Verificar unique constraint en student_id
-- ============================================================

-- Eliminar duplicados (mantener el más reciente)
DELETE FROM subscriptions a
USING subscriptions b
WHERE a.student_id = b.student_id
  AND a.created_at < b.created_at;

-- Agregar constraint si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_student_id_key'
    AND conrelid = 'subscriptions'::regclass
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_student_id_key UNIQUE (student_id);
  END IF;
END $$;

-- Confirmar columnas necesarias
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_slug TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- PASO 4: Ver el estado actual
-- ============================================================
SELECT
  s.student_id,
  sp.full_name,
  sp.email,
  s.plan_slug,
  s.plan_name,
  s.status,
  s.account_enabled,
  s.approved_by_admin,
  s.payment_method,
  s.created_at
FROM subscriptions s
LEFT JOIN student_profiles sp ON sp.id = s.student_id
ORDER BY s.created_at DESC
LIMIT 10;
