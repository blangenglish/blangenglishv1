-- Add unique constraint on student_id in subscriptions table so upsert works
-- First remove duplicate subscriptions keeping the most recent one
DELETE FROM subscriptions a
USING subscriptions b
WHERE a.student_id = b.student_id
  AND a.created_at < b.created_at;

-- Now add unique constraint
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_student_id_key;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_student_id_key UNIQUE (student_id);

-- Make sure subscriptions table has all needed columns
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing trial subscriptions: free trial = account enabled, no admin approval needed
UPDATE subscriptions
SET account_enabled = TRUE,
    approved_by_admin = TRUE,
    status = 'trial'
WHERE plan_slug = 'free_trial'
  AND (account_enabled = FALSE OR account_enabled IS NULL)
  AND payment_method IS NULL OR payment_method = '';

-- Set trial_ends_at for existing trial subs that don't have it
UPDATE subscriptions
SET trial_ends_at = COALESCE(current_period_end, created_at + INTERVAL '7 days')
WHERE plan_slug = 'free_trial'
  AND trial_ends_at IS NULL;
