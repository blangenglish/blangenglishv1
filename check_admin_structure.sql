-- Check table structure
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_users';

-- Check existing admins
SELECT * FROM admin_users;
