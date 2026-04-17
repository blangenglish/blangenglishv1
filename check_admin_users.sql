-- Check existing admin users
SELECT id, email, is_active, created_at FROM admin_users ORDER BY created_at;
